import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

/**
 * @openapi
 * /api/community:
 *   get:
 *     tags: [커뮤니티]
 *     summary: 게시글 목록
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 카테고리 필터
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 게시글 목록
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const { category, keyword, mine, page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: any = {};
  if (category) filter.category = category;
  if (mine === 'true' && req.userId) filter.userId = req.userId;
  if (keyword) {
    const kw = String(keyword).trim();
    filter.$or = [
      { title: { $regex: kw, $options: 'i' } },
      { content: { $regex: kw, $options: 'i' } },
    ];
  }

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate('userId', 'name agencyName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Post.countDocuments(filter),
  ]);

  res.json({ success: true, data: { posts, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/community:
 *   post:
 *     tags: [커뮤니티]
 *     summary: 게시글 작성
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               category:
 *                 type: string
 *                 example: "자유"
 *               title:
 *                 type: string
 *                 example: "강남 시세 문의"
 *               content:
 *                 type: string
 *                 example: "요즘 강남 오피스텔 시세가 어떤가요?"
 *     responses:
 *       201:
 *         description: 게시글 작성 성공
 *       400:
 *         description: 제목/내용 누락
 *       401:
 *         description: 인증 필요
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { category, title, content } = req.body;

  if (!title || !content) {
    res.status(400).json({ success: false, message: '제목과 내용을 입력해주세요.' });
    return;
  }

  const post = await Post.create({
    userId: req.userId,
    category: category || '자유',
    title,
    content,
  });

  res.status(201).json({ success: true, data: post });
});

/**
 * @openapi
 * /api/community/{id}:
 *   get:
 *     tags: [커뮤니티]
 *     summary: 게시글 상세 (댓글 포함)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 게시글 + 댓글
 *       404:
 *         description: 게시글을 찾을 수 없음
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('userId', 'name agencyName');

  if (!post) {
    res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    return;
  }

  // 댓글 조회
  const Comment = mongoose.model('Comment');
  const comments = await Comment.find({ postId: post._id })
    .populate('userId', 'name agencyName')
    .sort({ createdAt: 1 });

  res.json({ success: true, data: { post, comments } });
});

/**
 * @openapi
 * /api/community/{id}:
 *   delete:
 *     tags: [커뮤니티]
 *     summary: 게시글 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       403:
 *         description: 권한 없음
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id);

  if (!post || post.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await Post.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

/**
 * @openapi
 * /api/community/{id}/comments:
 *   post:
 *     tags: [커뮤니티]
 *     summary: 댓글 작성
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "좋은 정보 감사합니다!"
 *     responses:
 *       201:
 *         description: 댓글 작성 성공
 *       400:
 *         description: 내용 누락
 *       401:
 *         description: 인증 필요
 */
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ success: false, message: '내용을 입력해주세요.' });
    return;
  }

  const Comment = mongoose.model('Comment');
  const comment = await Comment.create({
    postId: req.params.id,
    userId: req.userId,
    content,
  });

  // commentCount 증가
  await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });

  res.status(201).json({ success: true, data: comment });
});

/**
 * @openapi
 * /api/community/{postId}/comments/{commentId}:
 *   put:
 *     tags: [커뮤니티]
 *     summary: 댓글 수정
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ success: false, message: '내용을 입력해주세요.' });
    return;
  }

  const Comment = mongoose.model('Comment');
  const comment = await Comment.findById(req.params.commentId);

  if (!comment || comment.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  comment.content = content;
  await comment.save();
  res.json({ success: true, data: comment });
});

/**
 * @openapi
 * /api/community/{postId}/comments/{commentId}:
 *   delete:
 *     tags: [커뮤니티]
 *     summary: 댓글 삭제
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const Comment = mongoose.model('Comment');
  const comment = await Comment.findById(req.params.commentId);

  if (!comment || comment.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await Comment.findByIdAndDelete(req.params.commentId);
  await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: -1 } });
  res.json({ success: true, message: '삭제되었습니다.' });
});

/**
 * @openapi
 * /api/community/{id}/like:
 *   post:
 *     tags: [커뮤니티]
 *     summary: 좋아요 토글
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    return;
  }

  const userId = req.userId!;
  const isLiked = post.likedBy.some((id) => id.toString() === userId);

  if (isLiked) {
    post.likedBy = post.likedBy.filter((id) => id.toString() !== userId) as any;
    post.likeCount = Math.max(0, post.likeCount - 1);
  } else {
    post.likedBy.push(userId as any);
    post.likeCount += 1;
  }

  await post.save();
  res.json({ success: true, data: { liked: !isLiked, likeCount: post.likeCount } });
});

export default router;

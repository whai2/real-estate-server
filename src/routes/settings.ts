import { Router, Response } from 'express';
import User from '../models/User';
import Inquiry from '../models/Inquiry';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── 푸시 설정 ───

/**
 * @openapi
 * /api/settings/push:
 *   get:
 *     tags: [설정]
 *     summary: 푸시 설정 조회
 *     security:
 *       - bearerAuth: []
 */
router.get('/push', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select('pushSettings');
  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }
  res.json({ success: true, data: user.pushSettings });
});

/**
 * @openapi
 * /api/settings/push:
 *   put:
 *     tags: [설정]
 *     summary: 푸시 설정 변경
 *     security:
 *       - bearerAuth: []
 */
router.put('/push', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { property, transaction, community, system } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  if (property !== undefined) user.pushSettings.property = property;
  if (transaction !== undefined) user.pushSettings.transaction = transaction;
  if (community !== undefined) user.pushSettings.community = community;
  if (system !== undefined) user.pushSettings.system = system;

  await user.save();
  res.json({ success: true, data: user.pushSettings });
});

// ─── QnA (문의 게시판) ───

/**
 * @openapi
 * /api/settings/qna:
 *   get:
 *     tags: [설정]
 *     summary: 문의 목록
 *     security:
 *       - bearerAuth: []
 */
router.get('/qna', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [inquiries, total] = await Promise.all([
    Inquiry.find({ userId: req.userId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Inquiry.countDocuments({ userId: req.userId }),
  ]);

  res.json({ success: true, data: { inquiries, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/settings/qna:
 *   post:
 *     tags: [설정]
 *     summary: 문의 등록
 *     security:
 *       - bearerAuth: []
 */
router.post('/qna', authMiddleware, async (req: AuthRequest, res: Response) => {
  const inquiry = await Inquiry.create({
    ...req.body,
    userId: req.userId,
  });
  res.status(201).json({ success: true, data: inquiry });
});

/**
 * @openapi
 * /api/settings/qna/{id}:
 *   get:
 *     tags: [설정]
 *     summary: 문의 상세
 *     security:
 *       - bearerAuth: []
 */
router.get('/qna/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry || inquiry.userId.toString() !== req.userId) {
    res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    return;
  }
  res.json({ success: true, data: inquiry });
});

export default router;

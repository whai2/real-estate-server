import { Router, Response } from 'express';
import Inquiry from '../models/Inquiry';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/inquiries:
 *   post:
 *     tags: [문의]
 *     summary: 문의 접수
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               propertyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: 문의 접수 성공
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, content, propertyId } = req.body;

  if (!title || !content) {
    res.status(400).json({ success: false, message: '제목과 내용을 입력해주세요.' });
    return;
  }

  const inquiry = await Inquiry.create({
    userId: req.userId,
    title,
    content,
    propertyId: propertyId || undefined,
  });

  res.status(201).json({ success: true, data: inquiry });
});

/**
 * @openapi
 * /api/inquiries/my:
 *   get:
 *     tags: [문의]
 *     summary: 내 문의 목록
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: 문의 목록
 */
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
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

export default router;

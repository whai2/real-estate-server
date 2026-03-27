import { Router, Response } from 'express';
import Format from '../models/Format';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/formats:
 *   get:
 *     tags: [서식]
 *     summary: 서식 목록
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const formats = await Format.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ success: true, data: formats });
});

/**
 * @openapi
 * /api/formats:
 *   post:
 *     tags: [서식]
 *     summary: 서식 저장
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const format = await Format.create({ ...req.body, userId: req.userId });
  res.status(201).json({ success: true, data: format });
});

/**
 * @openapi
 * /api/formats/{id}:
 *   delete:
 *     tags: [서식]
 *     summary: 서식 삭제
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const format = await Format.findById(req.params.id);
  if (!format || format.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await Format.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

export default router;

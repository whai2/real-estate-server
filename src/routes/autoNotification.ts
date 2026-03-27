import { Router, Response } from 'express';
import AutoNotification from '../models/AutoNotification';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/auto-notifications:
 *   get:
 *     tags: [자동알림]
 *     summary: 자동알림 규칙 목록
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const notifications = await AutoNotification.find({ userId: req.userId })
    .populate('propertyIds', 'title address')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: notifications });
});

/**
 * @openapi
 * /api/auto-notifications:
 *   post:
 *     tags: [자동알림]
 *     summary: 자동알림 규칙 생성
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const notification = await AutoNotification.create({
    ...req.body,
    userId: req.userId,
  });
  res.status(201).json({ success: true, data: notification });
});

/**
 * @openapi
 * /api/auto-notifications/{id}:
 *   put:
 *     tags: [자동알림]
 *     summary: 자동알림 규칙 수정
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const notification = await AutoNotification.findById(req.params.id);
  if (!notification || notification.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  const updated = await AutoNotification.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: updated });
});

/**
 * @openapi
 * /api/auto-notifications/{id}:
 *   delete:
 *     tags: [자동알림]
 *     summary: 자동알림 규칙 삭제
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const notification = await AutoNotification.findById(req.params.id);
  if (!notification || notification.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await AutoNotification.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

export default router;

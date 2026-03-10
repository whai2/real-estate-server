import { Router, Response } from 'express';
import Favorite from '../models/Favorite';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     tags: [관심매물]
 *     summary: 관심매물 목록 조회
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
 *         description: 관심매물 목록
 *       401:
 *         description: 인증 필요
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [favorites, total] = await Promise.all([
    Favorite.find({ userId: req.userId })
      .populate({
        path: 'propertyId',
        populate: { path: 'userId', select: 'name agencyName' },
      })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Favorite.countDocuments({ userId: req.userId }),
  ]);

  const properties = favorites
    .map((f) => f.propertyId)
    .filter(Boolean);

  res.json({ success: true, data: { properties, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/favorites/toggle:
 *   post:
 *     tags: [관심매물]
 *     summary: 관심매물 토글 (추가/삭제)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propertyId]
 *             properties:
 *               propertyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 토글 결과 (isFavorite 반환)
 *       400:
 *         description: 매물 ID 누락
 *       401:
 *         description: 인증 필요
 */
router.post('/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    res.status(400).json({ success: false, message: '매물 ID가 필요합니다.' });
    return;
  }

  const existing = await Favorite.findOne({
    userId: req.userId,
    propertyId,
  });

  if (existing) {
    await Favorite.findByIdAndDelete(existing._id);
    res.json({ success: true, data: { isFavorite: false }, message: '관심매물에서 삭제되었습니다.' });
  } else {
    await Favorite.create({ userId: req.userId, propertyId });
    res.json({ success: true, data: { isFavorite: true }, message: '관심매물에 추가되었습니다.' });
  }
});

/**
 * @openapi
 * /api/favorites/check/{propertyId}:
 *   get:
 *     tags: [관심매물]
 *     summary: 관심매물 여부 확인
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 관심매물 여부 (isFavorite 반환)
 *       401:
 *         description: 인증 필요
 */
router.get('/check/:propertyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const existing = await Favorite.findOne({
    userId: req.userId,
    propertyId: req.params.propertyId,
  });

  res.json({ success: true, data: { isFavorite: !!existing } });
});

export default router;

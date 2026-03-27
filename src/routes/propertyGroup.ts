import { Router, Response } from 'express';
import PropertyGroup from '../models/PropertyGroup';
import Property from '../models/Property';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/property-groups:
 *   get:
 *     tags: [매물그룹]
 *     summary: 그룹 목록
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groups = await PropertyGroup.find({ userId: req.userId }).sort({ name: 1 });

  // 각 그룹별 매물 수 집계
  const groupIds = groups.map((g) => g._id);
  const counts = await Property.aggregate([
    { $match: { groupId: { $in: groupIds }, status: { $ne: 'deleted' } } },
    { $group: { _id: '$groupId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c: { _id: string; count: number }) => [c._id.toString(), c.count]));

  const data = groups.map((g) => ({
    ...g.toObject(),
    propertyCount: countMap.get(g._id.toString()) || 0,
  }));

  res.json({ success: true, data });
});

/**
 * @openapi
 * /api/property-groups:
 *   post:
 *     tags: [매물그룹]
 *     summary: 그룹 생성
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const group = await PropertyGroup.create({ userId: req.userId, name });
  res.status(201).json({ success: true, data: group });
});

/**
 * @openapi
 * /api/property-groups/{id}:
 *   put:
 *     tags: [매물그룹]
 *     summary: 그룹 수정
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const group = await PropertyGroup.findById(req.params.id);
  if (!group || group.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  group.name = req.body.name;
  await group.save();
  res.json({ success: true, data: group });
});

/**
 * @openapi
 * /api/property-groups/{id}:
 *   delete:
 *     tags: [매물그룹]
 *     summary: 그룹 삭제 (소속 매물은 미지정으로)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const group = await PropertyGroup.findById(req.params.id);
  if (!group || group.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  // 소속 매물의 groupId 해제
  await Property.updateMany({ groupId: group._id }, { $unset: { groupId: 1 } });
  await PropertyGroup.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

export default router;

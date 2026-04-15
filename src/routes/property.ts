import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Property from '../models/Property';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { geocodeAddress } from '../services/kakao';

const router = Router();

/**
 * @openapi
 * /api/properties:
 *   get:
 *     tags: [매물]
 *     summary: 매물 목록 조회 (위치/키워드/필터)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const {
    lat, lng, radius = '5',
    type, propertyType, keyword, status,
    sort = 'newest',
    priceMin, priceMax,
    page = '1', limit = '20',
  } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: any = { status: status || 'active' };
  if (type) filter.type = type;
  if (propertyType) filter.propertyType = propertyType;

  if (keyword) {
    const kw = String(keyword).trim();
    filter.$or = [
      { title: { $regex: kw, $options: 'i' } },
      { address: { $regex: kw, $options: 'i' } },
      { description: { $regex: kw, $options: 'i' } },
      { memo: { $regex: kw, $options: 'i' } },
    ];
  }

  if (lat && lng) {
    const r = Number(radius) / 111;
    filter.lat = { $gte: Number(lat) - r, $lte: Number(lat) + r };
    filter.lng = { $gte: Number(lng) - r, $lte: Number(lng) + r };
  }

  let sortOption: any = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { 'trades.0.price': 1 };
  else if (sort === 'price_desc') sortOption = { 'trades.0.price': -1 };
  else if (sort === 'updated') sortOption = { updatedAt: -1 };
  else if (sort === 'name') sortOption = { title: 1 };

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .populate('userId', 'name agencyName')
      .populate('groupId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort(sortOption),
    Property.countDocuments(filter),
  ]);

  res.json({ success: true, data: { properties, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/properties/my:
 *   get:
 *     tags: [매물]
 *     summary: 내 매물 목록 (status, group 필터)
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', status, groupId, type, keyword } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: any = { userId: req.userId };
  if (status) filter.status = status;
  if (groupId) filter.groupId = groupId;
  if (type) filter.type = type;
  if (keyword) {
    const kw = String(keyword).trim();
    filter.$or = [
      { title: { $regex: kw, $options: 'i' } },
      { address: { $regex: kw, $options: 'i' } },
    ];
  }

  const [properties, total, statusCounts] = await Promise.all([
    Property.find(filter)
      .populate('groupId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Property.countDocuments(filter),
    Property.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  // 타입별 카운트
  const typeCounts = await Property.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.userId), status: { $ne: 'deleted' } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: { properties, total, page: Number(page), statusCounts, typeCounts },
  });
});

/**
 * @openapi
 * /api/properties/geo-search:
 *   get:
 *     tags: [매물]
 *     summary: 지도 영역 기반 매물 검색
 */
router.get('/geo-search', async (req: AuthRequest, res: Response) => {
  const { swLat, swLng, neLat, neLng, limit = '100' } = req.query;

  if (!swLat || !swLng || !neLat || !neLng) {
    res.status(400).json({ success: false, message: 'bounds 파라미터가 필요합니다.' });
    return;
  }

  const properties = await Property.find({
    status: 'active',
    lat: { $gte: Number(swLat), $lte: Number(neLat) },
    lng: { $gte: Number(swLng), $lte: Number(neLng) },
  })
    .select('title address lat lng propertyType trades rooms bathrooms score riskLevel photos type')
    .limit(Number(limit));

  res.json({ success: true, data: properties });
});

/**
 * @openapi
 * /api/properties/{id}:
 *   get:
 *     tags: [매물]
 *     summary: 매물 상세 조회
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id)
    .populate('userId', 'name agencyName phone')
    .populate('groupId', 'name');

  if (!property) {
    res.status(404).json({ success: false, message: '매물을 찾을 수 없습니다.' });
    return;
  }

  res.json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties/{id}/analysis:
 *   get:
 *     tags: [매물]
 *     summary: 매물 분석 (가격, 시장환경)
 */
router.get('/:id/analysis', async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404).json({ success: false, message: '매물을 찾을 수 없습니다.' });
    return;
  }

  // TODO: 실거래 데이터 연동 시 실제 분석 로직 추가
  const analysis = {
    summary: {
      score: property.score,
      riskLevel: property.riskLevel,
      tradeCount: property.trades.length,
    },
    priceAnalysis: {
      currentPrice: property.trades[0]?.price || 0,
      averagePrice: 0,
      priceGap: 0,
      trend: 'stable' as const,
    },
    marketEnvironment: {
      recentTransactions: 0,
      averageDays: 0,
      supplyDemand: 'balanced' as const,
    },
  };

  res.json({ success: true, data: analysis });
});

/**
 * @openapi
 * /api/properties:
 *   post:
 *     tags: [매물]
 *     summary: 매물 등록 (확장)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  let { lat, lng, address, ...rest } = req.body;

  if (address && (!lat || !lng)) {
    const coords = await geocodeAddress(address);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const property = await Property.create({
    ...rest,
    address,
    lat,
    lng,
    userId: req.userId,
    lastRefreshedAt: new Date(),
  });

  res.status(201).json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties/{id}:
 *   put:
 *     tags: [매물]
 *     summary: 매물 수정
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: updated });
});

/**
 * @openapi
 * /api/properties/{id}/status:
 *   patch:
 *     tags: [매물]
 *     summary: 매물 상태 변경 (active/hidden/completed/deleted)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  property.status = status;
  await property.save();
  res.json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties/{id}/refresh:
 *   patch:
 *     tags: [매물]
 *     summary: 매물 갱신 (자동숨김 방지)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/refresh', authMiddleware, async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  property.lastRefreshedAt = new Date();
  property.autoHideAt = undefined;
  if (property.status === 'autoHide') {
    property.status = 'active';
  }
  await property.save();
  res.json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties/batch-refresh:
 *   post:
 *     tags: [매물]
 *     summary: 매물 일괄 갱신
 *     security:
 *       - bearerAuth: []
 */
router.post('/batch-refresh', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await Property.updateMany(
    { userId: req.userId, status: { $in: ['active', 'autoHide'] } },
    {
      $set: { lastRefreshedAt: new Date(), autoHideAt: undefined },
    }
  );

  // autoHide 상태인 것들을 active로 복구
  await Property.updateMany(
    { userId: req.userId, status: 'autoHide' },
    { $set: { status: 'active' } }
  );

  res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
});

/**
 * @openapi
 * /api/properties/{id}/group:
 *   patch:
 *     tags: [매물]
 *     summary: 매물 그룹 할당
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/group', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.body;
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  property.groupId = groupId || undefined;
  await property.save();
  res.json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties/{id}/memo:
 *   patch:
 *     tags: [매물]
 *     summary: 관리메모 수정
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/memo', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { memo } = req.body;
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  property.memo = memo;
  await property.save();
  res.json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties/{id}:
 *   delete:
 *     tags: [매물]
 *     summary: 매물 삭제 (소프트 삭제)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  property.status = 'deleted';
  await property.save();
  res.json({ success: true, message: '삭제되었습니다.' });
});

export default router;

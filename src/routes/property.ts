import { Router, Response } from 'express';
import Property from '../models/Property';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { geocodeAddress } from '../services/kakao';

const router = Router();

/**
 * @openapi
 * /api/properties:
 *   get:
 *     tags: [매물]
 *     summary: 매물 목록 조회 (위치 기반)
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: 위도
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: 경도
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5
 *         description: 반경 (km)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [open, general]
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
 *         description: 매물 목록
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const { lat, lng, radius = '5', type, page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: any = { status: 'active' };
  if (type) filter.type = type;

  // 위치 기반 필터링 (간단한 범위 쿼리)
  if (lat && lng) {
    const r = Number(radius) / 111; // km -> 위경도 근사 변환
    filter.lat = { $gte: Number(lat) - r, $lte: Number(lat) + r };
    filter.lng = { $gte: Number(lng) - r, $lte: Number(lng) + r };
  }

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .populate('userId', 'name agencyName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Property.countDocuments(filter),
  ]);

  res.json({ success: true, data: { properties, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/properties/my:
 *   get:
 *     tags: [매물]
 *     summary: 내 매물 목록
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
 *         description: 내 매물 목록
 *       401:
 *         description: 인증 필요
 */
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [properties, total] = await Promise.all([
    Property.find({ userId: req.userId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Property.countDocuments({ userId: req.userId }),
  ]);

  res.json({ success: true, data: { properties, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/properties/{id}:
 *   get:
 *     tags: [매물]
 *     summary: 매물 상세 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 매물 상세 정보
 *       404:
 *         description: 매물을 찾을 수 없음
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id).populate(
    'userId',
    'name agencyName phone'
  );

  if (!property) {
    res.status(404).json({ success: false, message: '매물을 찾을 수 없습니다.' });
    return;
  }

  res.json({ success: true, data: property });
});

/**
 * @openapi
 * /api/properties:
 *   post:
 *     tags: [매물]
 *     summary: 매물 등록
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, title, address, lat, lng, price]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [open, general]
 *               title:
 *                 type: string
 *                 example: "강남역 오피스텔 매매"
 *               address:
 *                 type: string
 *                 example: "서울시 강남구 역삼동 123"
 *               lat:
 *                 type: number
 *                 example: 37.4979
 *               lng:
 *                 type: number
 *                 example: 127.0276
 *               price:
 *                 type: string
 *                 example: "3억 5000"
 *               deposit:
 *                 type: string
 *               monthlyRent:
 *                 type: string
 *               area:
 *                 type: number
 *               floor:
 *                 type: string
 *               rooms:
 *                 type: number
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       201:
 *         description: 매물 등록 성공
 *       401:
 *         description: 인증 필요
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  let { lat, lng, address, ...rest } = req.body;

  // 주소가 있고 좌표가 없으면 Kakao Geocoding으로 변환
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               address:
 *                 type: string
 *               price:
 *                 type: string
 *               deposit:
 *                 type: string
 *               monthlyRent:
 *                 type: string
 *               area:
 *                 type: number
 *               floor:
 *                 type: string
 *               rooms:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 매물 수정 성공
 *       403:
 *         description: 권한 없음
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  const updated = await Property.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json({ success: true, data: updated });
});

/**
 * @openapi
 * /api/properties/{id}:
 *   delete:
 *     tags: [매물]
 *     summary: 매물 삭제
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
  const property = await Property.findById(req.params.id);

  if (!property || property.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await Property.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

export default router;

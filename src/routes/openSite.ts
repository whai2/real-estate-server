import { Router, Response } from 'express';
import OpenSite from '../models/OpenSite';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { geocodeAddress } from '../services/kakao';

const router = Router();

/**
 * @openapi
 * /api/open-sites:
 *   get:
 *     tags: [오픈현장]
 *     summary: 오픈현장 목록 (월별 필터)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { year, month, keyword } = req.query;

  const filter: any = { userId: req.userId };

  if (year && month) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
    filter.scheduledDate = { $gte: start, $lte: end };
  }

  if (keyword) {
    const kw = String(keyword).trim();
    filter.$or = [
      { title: { $regex: kw, $options: 'i' } },
      { address: { $regex: kw, $options: 'i' } },
    ];
  }

  const sites = await OpenSite.find(filter).sort({ scheduledDate: 1 });
  res.json({ success: true, data: sites });
});

/**
 * @openapi
 * /api/open-sites/{id}:
 *   get:
 *     tags: [오픈현장]
 *     summary: 오픈현장 상세
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const site = await OpenSite.findById(req.params.id);
  if (!site) {
    res.status(404).json({ success: false, message: '오픈현장을 찾을 수 없습니다.' });
    return;
  }
  res.json({ success: true, data: site });
});

/**
 * @openapi
 * /api/open-sites:
 *   post:
 *     tags: [오픈현장]
 *     summary: 오픈현장 등록
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

  const site = await OpenSite.create({
    ...rest,
    address,
    lat,
    lng,
    userId: req.userId,
  });

  res.status(201).json({ success: true, data: site });
});

/**
 * @openapi
 * /api/open-sites/{id}:
 *   put:
 *     tags: [오픈현장]
 *     summary: 오픈현장 수정
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const site = await OpenSite.findById(req.params.id);
  if (!site || site.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  const updated = await OpenSite.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: updated });
});

/**
 * @openapi
 * /api/open-sites/{id}:
 *   delete:
 *     tags: [오픈현장]
 *     summary: 오픈현장 삭제
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const site = await OpenSite.findById(req.params.id);
  if (!site || site.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await OpenSite.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

/**
 * @openapi
 * /api/open-sites/{id}/survey:
 *   patch:
 *     tags: [오픈현장]
 *     summary: 답사 상태 변경
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/survey', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { surveyStatus } = req.body;
  const site = await OpenSite.findById(req.params.id);

  if (!site || site.userId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  site.surveyStatus = surveyStatus;
  await site.save();
  res.json({ success: true, data: site });
});

export default router;

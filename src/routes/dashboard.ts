import { Router, Response } from 'express';
import Property from '../models/Property';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [대시보드]
 *     summary: 위험도별 매물 카운트
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  const counts = await Property.aggregate([
    { $match: { userId: req.userId, status: 'active' } },
    {
      $group: {
        _id: '$riskLevel',
        count: { $sum: 1 },
      },
    },
  ]);

  const total = await Property.countDocuments({ userId: req.userId, status: 'active' });

  const summary = {
    total,
    danger: 0,
    caution: 0,
    safe: 0,
  };

  counts.forEach((c: { _id: string; count: number }) => {
    if (c._id === 'danger') summary.danger = c.count;
    else if (c._id === 'caution') summary.caution = c.count;
    else if (c._id === 'safe') summary.safe = c.count;
  });

  res.json({ success: true, data: summary });
});

/**
 * @openapi
 * /api/dashboard/hot-regions:
 *   get:
 *     tags: [대시보드]
 *     summary: 거래 HOT 지역 TOP 10
 */
router.get('/hot-regions', async (req: AuthRequest, res: Response) => {
  const { region, period = '1month' } = req.query;

  // TODO: 실거래 데이터 API 연동 시 실제 데이터로 교체
  // 현재는 샘플 데이터 반환
  const hotRegions = [
    { rank: 1, region: '인천 연수구 송도동', totalTrades: 1262, rankChange: 3, trend: 'up' },
    { rank: 2, region: '서울 노원구 상계동', totalTrades: 1198, rankChange: 4, trend: 'up' },
    { rank: 3, region: '경기 화성시 동탄2', totalTrades: 1150, rankChange: -1, trend: 'down' },
    { rank: 4, region: '서울 강서구 마곡동', totalTrades: 1089, rankChange: 2, trend: 'up' },
    { rank: 5, region: '경기 남양주시 다산동', totalTrades: 985, rankChange: 0, trend: 'stable' },
    { rank: 6, region: '서울 송파구 가락동', totalTrades: 920, rankChange: -2, trend: 'down' },
    { rank: 7, region: '경기 수원시 영통구', totalTrades: 870, rankChange: 1, trend: 'up' },
    { rank: 8, region: '인천 서구 검단동', totalTrades: 810, rankChange: 5, trend: 'up' },
    { rank: 9, region: '서울 마포구 상암동', totalTrades: 750, rankChange: -1, trend: 'down' },
    { rank: 10, region: '경기 안양시 만안구 안양동', totalTrades: 670, rankChange: 6, trend: 'up' },
  ];

  // 지역 필터링
  let filtered = hotRegions;
  if (region && region !== 'all') {
    filtered = hotRegions.filter((r) => r.region.startsWith(String(region)));
  }

  res.json({
    success: true,
    data: {
      regions: filtered,
      updatedAt: new Date().toISOString(),
      period,
    },
  });
});

/**
 * @openapi
 * /api/dashboard/auto-hide-warning:
 *   get:
 *     tags: [대시보드]
 *     summary: 자동숨김 예정 매물 조회
 *     security:
 *       - bearerAuth: []
 */
router.get('/auto-hide-warning', authMiddleware, async (req: AuthRequest, res: Response) => {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 23); // 30일 기준 - 7일 = 23일 전

  const properties = await Property.find({
    userId: req.userId,
    status: 'active',
    lastRefreshedAt: { $lte: thirtyDaysAgo },
  }).select('title address lastRefreshedAt');

  res.json({ success: true, data: { count: properties.length, properties } });
});

export default router;

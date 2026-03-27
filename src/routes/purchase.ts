import { Router, Response } from 'express';
import User from '../models/User';
import PurchaseHistory from '../models/PurchaseHistory';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 포인트 충전 옵션
const POINT_OPTIONS = [
  { points: 10000, price: 11000 },
  { points: 20000, price: 22000 },
  { points: 30000, price: 33000 },
  { points: 50000, price: 55000 },
  { points: 100000, price: 110000 },
  { points: 200000, price: 220000 },
];

// 이용권 옵션
const SUBSCRIPTION_OPTIONS = [
  { days: 30, price: 12000, discount: 0 },
  { days: 90, price: 30000, discount: 17 },
  { days: 180, price: 50000, discount: 31 },
  { days: 400, price: 100000, discount: 38 },
];

/**
 * @openapi
 * /api/purchase/points:
 *   post:
 *     tags: [구매]
 *     summary: 포인트 충전
 *     security:
 *       - bearerAuth: []
 */
router.post('/points', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { points, method } = req.body;

  const option = POINT_OPTIONS.find((o) => o.points === points);
  if (!option) {
    res.status(400).json({ success: false, message: '유효하지 않은 충전 옵션입니다.' });
    return;
  }

  // TODO: 실제 결제 게이트웨이 연동
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  user.subscription.points += option.points;
  await user.save();

  await PurchaseHistory.create({
    userId: req.userId,
    type: 'point',
    amount: option.points,
    price: option.price,
    method,
    description: `포인트 ${option.points.toLocaleString()}P 충전`,
  });

  res.json({ success: true, data: { points: user.subscription.points } });
});

/**
 * @openapi
 * /api/purchase/subscription:
 *   post:
 *     tags: [구매]
 *     summary: 이용권 구매 (포인트 차감)
 *     security:
 *       - bearerAuth: []
 */
router.post('/subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { days } = req.body;

  const option = SUBSCRIPTION_OPTIONS.find((o) => o.days === days);
  if (!option) {
    res.status(400).json({ success: false, message: '유효하지 않은 이용권 옵션입니다.' });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  if (user.subscription.points < option.price) {
    res.status(400).json({ success: false, message: '포인트가 부족합니다.' });
    return;
  }

  user.subscription.points -= option.price;

  // 기존 만료일이 미래면 연장, 아니면 오늘부터
  const baseDate = user.subscription.expiresAt > new Date()
    ? user.subscription.expiresAt
    : new Date();
  user.subscription.expiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  user.subscription.plan = `${days}day`;
  await user.save();

  await PurchaseHistory.create({
    userId: req.userId,
    type: 'subscription',
    amount: days,
    price: option.price,
    description: `${days}일 이용권 구매`,
  });

  res.json({ success: true, data: { subscription: user.subscription } });
});

/**
 * @openapi
 * /api/purchase/notification-option:
 *   post:
 *     tags: [구매]
 *     summary: 알림옵션 구매 (상단고정/PUSH/패키지)
 *     security:
 *       - bearerAuth: []
 */
router.post('/notification-option', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { type, count } = req.body; // type: 'pin' | 'push' | 'package'

  const NOTIFICATION_OPTIONS: Record<string, Record<number, number>> = {
    pin: { 5: 15000, 15: 30000, 30: 50000 },
    push: { 5: 15000, 15: 30000, 30: 50000 },
    package: { 5: 25000, 15: 50000, 30: 100000 },
  };

  const price = NOTIFICATION_OPTIONS[type]?.[count];
  if (!price) {
    res.status(400).json({ success: false, message: '유효하지 않은 옵션입니다.' });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  if (user.subscription.points < price) {
    res.status(400).json({ success: false, message: '포인트가 부족합니다.' });
    return;
  }

  user.subscription.points -= price;
  if (type === 'pin' || type === 'package') {
    user.subscription.pinCount += count;
  }
  if (type === 'push' || type === 'package') {
    user.subscription.pushCount += count;
  }

  // 패키지 30회: 60일 이용권 보너스
  if (type === 'package' && count === 30) {
    const baseDate = user.subscription.expiresAt > new Date()
      ? user.subscription.expiresAt
      : new Date();
    user.subscription.expiresAt = new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000);
  }

  await user.save();

  await PurchaseHistory.create({
    userId: req.userId,
    type: type === 'package' ? 'package' : type,
    amount: count,
    price,
    description: `알림옵션 ${type} ${count}회 구매`,
  });

  res.json({ success: true, data: { subscription: user.subscription } });
});

/**
 * @openapi
 * /api/subscription/status:
 *   get:
 *     tags: [구매]
 *     summary: 현재 구독 상태
 *     security:
 *       - bearerAuth: []
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select('subscription');
  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  const now = new Date();
  const isActive = user.subscription.expiresAt > now;
  const remainingDays = isActive
    ? Math.ceil((user.subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({
    success: true,
    data: {
      ...user.subscription,
      isActive,
      remainingDays,
    },
  });
});

export default router;

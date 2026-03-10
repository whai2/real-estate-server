import { Router, Response } from 'express';
import Notification from '../models/Notification';
import User from '../models/User';
import PointHistory from '../models/PointHistory';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendPushNotifications } from '../services/firebase';

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [알림]
 *     summary: 알림 목록 조회
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
 *         description: 알림 목록
 *       401:
 *         description: 인증 필요
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total] = await Promise.all([
    Notification.find()
      .populate('senderId', 'name agencyName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ sentAt: -1 }),
    Notification.countDocuments(),
  ]);

  res.json({ success: true, data: { notifications, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     tags: [알림]
 *     summary: 알림 보내기
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
 *                 example: "강남역 신규 매물"
 *               content:
 *                 type: string
 *                 example: "오피스텔 매매 3억 5000"
 *               targetArea:
 *                 type: string
 *               conditions:
 *                 type: object
 *     responses:
 *       201:
 *         description: 알림 발송 성공
 *       400:
 *         description: 제목/내용 누락
 *       401:
 *         description: 인증 필요
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, content, targetArea, conditions } = req.body;

  if (!title || !content) {
    res.status(400).json({ success: false, message: '제목과 내용을 입력해주세요.' });
    return;
  }

  // pushCount 확인
  const sender = await User.findById(req.userId);
  if (!sender || sender.subscription.pushCount <= 0) {
    res.status(400).json({ success: false, message: 'PUSH 발송 횟수가 부족합니다.' });
    return;
  }

  // 대상 유저 조회 (발송자 제외, 디바이스 토큰 보유자)
  const targetQuery: any = {
    _id: { $ne: req.userId },
    'deviceTokens.0': { $exists: true },
  };

  const targetUsers = await User.find(targetQuery).select('deviceTokens');

  // 디바이스 토큰 수집
  const tokens: string[] = [];
  targetUsers.forEach((user) => {
    user.deviceTokens.forEach((dt) => {
      tokens.push(dt.token);
    });
  });

  // 알림 레코드 생성
  const notification = await Notification.create({
    senderId: req.userId,
    title,
    content,
    targetArea,
    conditions,
  });

  // FCM 푸시 발송
  let sentCount = 0;
  let failedCount = 0;

  if (tokens.length > 0) {
    const result = await sendPushNotifications(tokens, {
      title,
      body: content,
      data: { notificationId: notification._id.toString() },
    });
    sentCount = result.successCount;
    failedCount = result.failureCount;

    // 실패한 토큰 정리
    if (result.failedTokens.length > 0) {
      await User.updateMany(
        {},
        { $pull: { deviceTokens: { token: { $in: result.failedTokens } } } }
      );
    }
  }

  // 발송 결과 업데이트
  await Notification.findByIdAndUpdate(notification._id, { sentCount, failedCount });

  // pushCount 차감
  await User.findByIdAndUpdate(req.userId, {
    $inc: { 'subscription.pushCount': -1 },
  });

  // 포인트 내역 기록
  await PointHistory.create({
    userId: req.userId,
    amount: -1,
    type: 'use',
    description: `PUSH 알림 발송: ${title}`,
  });

  res.status(201).json({
    success: true,
    data: { ...notification.toObject(), sentCount, failedCount },
  });
});

/**
 * @openapi
 * /api/notifications/{id}:
 *   get:
 *     tags: [알림]
 *     summary: 알림 상세 조회
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
 *         description: 알림 상세 정보
 *       404:
 *         description: 알림을 찾을 수 없음
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const notification = await Notification.findById(req.params.id)
    .populate('senderId', 'name agencyName');

  if (!notification) {
    res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
    return;
  }

  res.json({ success: true, data: notification });
});

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [알림]
 *     summary: 알림 삭제
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
  const notification = await Notification.findById(req.params.id);

  if (!notification || notification.senderId.toString() !== req.userId) {
    res.status(403).json({ success: false, message: '권한이 없습니다.' });
    return;
  }

  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: '삭제되었습니다.' });
});

export default router;

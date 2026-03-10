import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import PointHistory from '../models/PointHistory';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendSMS } from '../services/sms';

const router = Router();

// 인증번호 임시 저장 (프로덕션에서는 Redis 사용 권장)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

/**
 * @openapi
 * /api/auth/send-code:
 *   post:
 *     tags: [인증]
 *     summary: SMS 인증번호 요청
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "01012345678"
 *     responses:
 *       200:
 *         description: 인증번호 발송 성공
 *       400:
 *         description: 전화번호 누락
 */
router.post('/send-code', async (req: Request, res: Response) => {
  const { phone, type } = req.body;

  if (!phone) {
    res.status(400).json({ success: false, message: '전화번호를 입력해주세요.' });
    return;
  }

  // 로그인 시 가입 여부 확인
  if (type !== 'signup') {
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(404).json({ success: false, message: '등록되지 않은 번호입니다. 회원가입을 진행해주세요.' });
      return;
    }
  }

  // 6자리 인증번호 생성
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(phone, {
    code,
    expiresAt: Date.now() + 3 * 60 * 1000, // 3분
  });

  // SMS 발송
  try {
    await sendSMS(phone, `[부동산매물공유] 인증번호: ${code}`);
  } catch (smsError) {
    console.error('[SMS] 발송 실패:', smsError);
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ success: false, message: 'SMS 발송에 실패했습니다.' });
      return;
    }
    console.log(`[DEV fallback] ${phone}: ${code}`);
  }

  res.json({ success: true, message: '인증번호가 발송되었습니다.' });
});

/**
 * @openapi
 * /api/auth/verify:
 *   post:
 *     tags: [인증]
 *     summary: 인증번호 확인 + 로그인/회원가입
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "01012345678"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 로그인 성공 (token, user, isNewUser 반환)
 *       400:
 *         description: 인증번호 불일치
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { phone, code } = req.body;

  const stored = verificationCodes.get(phone);
  if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
    res.status(400).json({ success: false, message: '인증번호가 올바르지 않습니다.' });
    return;
  }

  verificationCodes.delete(phone);

  // 기존 유저 조회
  const user = await User.findOne({ phone });

  if (!user) {
    res.status(404).json({ success: false, message: '등록되지 않은 회원입니다. 회원가입을 진행해주세요.' });
    return;
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  });

  res.json({
    success: true,
    data: { token, user },
  });
});

/**
 * @openapi
 * /api/auth/signup-verify:
 *   post:
 *     tags: [인증]
 *     summary: 회원가입 인증번호 확인 + 회원 생성
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: 회원가입 성공
 *       400:
 *         description: 인증번호 불일치 또는 이미 가입된 번호
 */
router.post('/signup-verify', async (req: Request, res: Response) => {
  const { phone, code } = req.body;

  const stored = verificationCodes.get(phone);
  if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
    res.status(400).json({ success: false, message: '인증번호가 올바르지 않습니다.' });
    return;
  }

  verificationCodes.delete(phone);

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    res.status(400).json({ success: false, message: '이미 가입된 번호입니다. 로그인을 이용해주세요.' });
    return;
  }

  const user = await User.create({ phone });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  });

  res.json({
    success: true,
    data: { token, user, isNewUser: true },
  });
});

/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     tags: [인증]
 *     summary: 회원가입 정보 입력 (프로필 완성)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, name, agencyName]
 *             properties:
 *               userId:
 *                 type: string
 *               name:
 *                 type: string
 *                 example: "홍길동"
 *               agencyName:
 *                 type: string
 *                 example: "길동부동산"
 *               licenseNo:
 *                 type: string
 *                 example: "2024-01-12345"
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.put('/profile', async (req: Request, res: Response) => {
  const { userId, name, agencyName, licenseNo } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { name, agencyName, licenseNo },
    { new: true }
  );

  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  res.json({ success: true, data: user });
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [인증]
 *     summary: 내 정보 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 반환
 *       401:
 *         description: 인증 필요
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select('-__v');

  if (!user) {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  res.json({ success: true, data: user });
});

/**
 * @openapi
 * /api/auth/point-history:
 *   get:
 *     tags: [인증]
 *     summary: 포인트 내역 조회
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
 *         description: 포인트 내역 목록
 *       401:
 *         description: 인증 필요
 */
router.get('/point-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    PointHistory.find({ userId: req.userId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    PointHistory.countDocuments({ userId: req.userId }),
  ]);

  res.json({ success: true, data: { records, total, page: Number(page) } });
});

/**
 * @openapi
 * /api/auth/device-token:
 *   post:
 *     tags: [인증]
 *     summary: 디바이스 토큰 등록 (푸시 알림용)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, platform]
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *     responses:
 *       200:
 *         description: 토큰 등록 성공
 */
router.post('/device-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { token, platform } = req.body;

  if (!token || !platform) {
    res.status(400).json({ success: false, message: '토큰과 플랫폼을 입력해주세요.' });
    return;
  }

  // 기존 토큰 제거 후 새로 추가 (중복 방지)
  await User.findByIdAndUpdate(req.userId, {
    $pull: { deviceTokens: { token } },
  });

  await User.findByIdAndUpdate(req.userId, {
    $push: {
      deviceTokens: { token, platform, createdAt: new Date() },
    },
  });

  res.json({ success: true, message: '디바이스 토큰이 등록되었습니다.' });
});

export default router;

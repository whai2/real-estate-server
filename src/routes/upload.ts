import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getPresignedUploadUrl } from '../services/s3';

const router = Router();

/**
 * @openapi
 * /api/upload/presigned-url:
 *   get:
 *     tags: [업로드]
 *     summary: S3 presigned URL 발급
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Presigned URL 반환
 */
router.get('/presigned-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { filename, contentType } = req.query;

  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename과 contentType을 입력해주세요.' });
    return;
  }

  const result = await getPresignedUploadUrl(
    filename as string,
    contentType as string
  );

  res.json({ success: true, data: result });
});

export default router;

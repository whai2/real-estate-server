import { Router } from 'express';
import { geocodeAddress } from '../services/kakao';

const router = Router();

router.get('/', async (req, res) => {
  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    res.status(400).json({ success: false, message: 'address 파라미터가 필요합니다.' });
    return;
  }
  const result = await geocodeAddress(address);
  res.json({ success: true, data: result });
});

export default router;

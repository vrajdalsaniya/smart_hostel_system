import { Router } from 'express';
import { createFee, deleteFee, listFees, updateFee } from '../controllers/feeController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate); router.get('/', listFees); router.post('/', allowRoles('admin'), createFee); router.put('/:id', allowRoles('admin'), updateFee); router.delete('/:id', allowRoles('admin'), deleteFee);
export default router;

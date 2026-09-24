import { Router } from 'express';
import { createAllocation, deleteAllocation, listAllocations } from '../controllers/allocationController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate); router.get('/', listAllocations); router.post('/', allowRoles('admin'), createAllocation); router.delete('/:id', allowRoles('admin'), deleteAllocation);
export default router;

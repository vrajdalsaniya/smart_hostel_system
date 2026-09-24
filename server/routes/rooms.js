import { Router } from 'express';
import { createRoom, deleteRoom, getRoom, listRooms, updateRoom } from '../controllers/roomController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate);
router.get('/', listRooms); router.get('/:id', getRoom); router.post('/', allowRoles('admin'), createRoom); router.put('/:id', allowRoles('admin'), updateRoom); router.delete('/:id', allowRoles('admin'), deleteRoom);
export default router;

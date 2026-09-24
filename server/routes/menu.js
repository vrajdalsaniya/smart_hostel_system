import { Router } from 'express';
import { createMenu, deleteMenu, listMenu, updateMenu } from '../controllers/menuController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate); router.get('/', listMenu); router.post('/', allowRoles('admin'), createMenu); router.put('/:id', allowRoles('admin'), updateMenu); router.delete('/:id', allowRoles('admin'), deleteMenu);
export default router;

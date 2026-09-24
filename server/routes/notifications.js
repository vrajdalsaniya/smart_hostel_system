import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearAllNotifications);

export default router;

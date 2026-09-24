import { Router } from 'express';
import { adminDashboard, studentDashboard } from '../controllers/dashboardController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate); router.get('/admin', allowRoles('admin'), adminDashboard); router.get('/student', allowRoles('student'), studentDashboard);
export default router;

import { Router } from 'express';
import { allocationReport, complaintReport, feeReport, roomReport, studentReport, wifiReport } from '../controllers/reportController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate, allowRoles('admin')); router.get('/students', studentReport); router.get('/fees', feeReport); router.get('/complaints', complaintReport); router.get('/rooms', roomReport); router.get('/allocations', allocationReport); router.get('/wifi', wifiReport);

export default router;

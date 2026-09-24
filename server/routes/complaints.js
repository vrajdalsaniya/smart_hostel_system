import { Router } from 'express';
import { createComplaint, deleteComplaint, listComplaints, updateComplaint } from '../controllers/complaintController.js';
import { authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate); router.route('/').get(listComplaints).post(createComplaint); router.route('/:id').put(updateComplaint).delete(deleteComplaint);
export default router;

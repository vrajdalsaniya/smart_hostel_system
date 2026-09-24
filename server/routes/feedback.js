import { Router } from 'express';
import { createFeedback, deleteFeedback, listFeedback } from '../controllers/feedbackController.js';
import { authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate); router.route('/').get(listFeedback).post(createFeedback); router.delete('/:id', deleteFeedback);
export default router;

import { Router } from 'express';
import { allowRoles, authenticate } from '../middleware/auth.js';
import {
  listWaitlist,
  getMyWaitlistStatus,
  addToWaitlist,
  updateWaitlistStatus,
  removeFromWaitlist,
  allocateFromWaitlist
} from '../controllers/waitlistController.js';

const router = Router();

router.use(authenticate);

router.get('/my-status', getMyWaitlistStatus);
router.post('/join', addToWaitlist);

router.get('/', allowRoles('admin'), listWaitlist);
router.post('/', allowRoles('admin'), addToWaitlist);
router.post('/allocate', allowRoles('admin'), allocateFromWaitlist);
router.put('/:id', allowRoles('admin'), updateWaitlistStatus);
router.delete('/:id', allowRoles('admin'), removeFromWaitlist);

export default router;

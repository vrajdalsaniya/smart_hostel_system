import { Router } from 'express';
import { login, logout, me, register, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.post('/register', register); router.post('/login', login); router.post('/forgot-password', requestPasswordReset); router.post('/reset-password', resetPassword); router.post('/logout', authenticate, logout); router.get('/me', authenticate, me);
export default router;

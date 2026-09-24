import { Router } from 'express';
import { changePassword, getProfile, updatePhoto, updateProfile } from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';
const router = Router(); router.use(authenticate); router.get('/', getProfile); router.put('/', updateProfile); router.put('/password', changePassword); router.put('/photo', uploadPhoto.single('photo'), updatePhoto);
export default router;

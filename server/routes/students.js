import { Router } from 'express';
import { createStudent, deleteStudent, getStudent, listStudents, updateStudent } from '../controllers/studentController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate, allowRoles('admin'));
router.route('/').get(listStudents).post(createStudent); router.route('/:id').get(getStudent).put(updateStudent).delete(deleteStudent);
export default router;

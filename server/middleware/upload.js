import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { httpError } from '../utils/http.js';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
fs.mkdirSync(directory, { recursive: true });
const storage = multer.diskStorage({
  destination: directory,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`)
});
export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(httpError(400, 'Please upload an image file.'))
});

import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

const parse = multer({
  // Memory, not disk: the bytes go to Sharp for inspection before anything is saved, so a fake file
  // never touches the disk. The 10 MB cap bounds how much RAM one upload can take.
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  defParamCharset: 'utf8', // multer's default (latin1) garbles non-English file names like "फोटो.jpg"
  // A cheap first filter on the type the browser *claims*. It's just a label anyone can fake,
  // so the real check is Sharp reading the bytes (services/upload.js).
  fileFilter: (req, file, cb) =>
    ACCEPTED_TYPES.has(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, 'UNSUPPORTED_FILE', 'Upload a JPEG, PNG, WebP, GIF or AVIF image')),
}).single('image');

// Runs multer, then turns its errors into our error codes and shape.
export function parseImageUpload(req, res, next) {
  parse(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'FILE_TOO_LARGE', 'Images can be at most 10 MB'));
    // Wrong field name, more than one file, etc.
    if (err instanceof multer.MulterError) return next(new ApiError(400, 'VALIDATION_FAILED', err.message));
    if (err) return next(err);
    if (!req.file) return next(new ApiError(400, 'VALIDATION_FAILED', 'Attach an image in the "image" field'));
    next();
  });
}

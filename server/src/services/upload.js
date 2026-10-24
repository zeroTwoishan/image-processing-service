import { randomUUID } from 'node:crypto';
import { openImage, MAX_PIXELS } from './openImage.js';
import { makeThumbnail } from './thumbnail.js';
import { detectFormat, FORMATS } from './formats.js';
import { ApiError } from '../utils/ApiError.js';

// Re-encode in the same format. Quality 90 is visually identical for photos; PNG and GIF are lossless anyway.
const UPLOAD_QUALITY = 90;

const unsupported = () => new ApiError(400, 'UNSUPPORTED_FILE', 'That file isn’t a supported image (JPEG, PNG, WebP, GIF or AVIF)');
const tooManyPixels = () =>
  new ApiError(413, 'FILE_TOO_LARGE', `That image has too many pixels (max ${MAX_PIXELS / 1_000_000} megapixels)`);

/**
 * Checks that an uploaded buffer is a real, allowed image, and prepares the files to store.
 * Pure: no Express, no Mongo, no disk. Returns { original, thumbnail } with storage keys and buffers.
 *
 * Still images are re-encoded: .autoOrient() turns the pixels upright (phones save photos sideways plus an
 * EXIF "rotate me" tag), and Sharp drops all metadata on output, so GPS location and camera details are gone.
 * Animated images are stored untouched, because re-encoding would flatten them to one frame.
 */
export async function prepareUpload(buffer) {
  try {
    // Reads only the header: format, dimensions, frame count. The pixel limit is enforced here already.
    const meta = await openImage(buffer).metadata();
    const format = detectFormat(meta);
    if (!format) throw unsupported();
    const type = FORMATS[format];

    const animated = (meta.pages ?? 1) > 1;
    const id = randomUUID(); // unguessable, collision-free, and never derived from the user's file name

    const [original, thumbnail] = await Promise.all([
      animated
        ? // Opened normally, Sharp reports one frame's height, which is the size people see.
          { buffer, width: meta.width, height: meta.pageHeight ?? meta.height }
        : type.encode(openImage(buffer).autoOrient(), UPLOAD_QUALITY)
            .toBuffer({ resolveWithObject: true })
            // info = the real output size, already upright (a portrait phone photo gives 3024×4032)
            .then(({ data, info }) => ({ buffer: data, width: info.width, height: info.height })),
      makeThumbnail(buffer),
    ]);

    return {
      original: {
        key: `originals/${id}.${type.ext}`,
        buffer: original.buffer,
        width: original.width,
        height: original.height,
        size: original.buffer.length,
        format,
        mimeType: type.mimeType,
        animated,
      },
      thumbnail: { key: `thumbnails/${id}.webp`, buffer: thumbnail },
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Every other failure here is Sharp refusing the bytes we were given, so it's the upload's fault, not ours.
    if (/pixel limit/i.test(err.message)) throw tooManyPixels();
    throw unsupported();
  }
}

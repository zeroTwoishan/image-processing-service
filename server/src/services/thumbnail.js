import { openImage } from './openImage.js';

export const THUMBNAIL_WIDTH = 400;

// ~400px-wide WebP for gallery cards: ~30 KB instead of ~3 MB per photo.
// Used for uploads now and for transformed versions in Phase 3. Pure: buffer in, buffer out.
export function makeThumbnail(buffer) {
  return (
    openImage(buffer, { pages: 1 }) // first frame only, so animated GIF/AVIF get a still thumbnail
      .autoOrient() // upright even when the source still has an EXIF orientation tag
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true }) // never blow up small images
      .webp({ quality: 75 }) // metadata is dropped on output by default, so no EXIF/GPS survives
      .toBuffer()
  );
}

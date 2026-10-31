import { openImage } from '../services/openImage.js';
import { detectFormat } from '../services/formats.js';
import { applyTransform } from '../services/transform.js';
import { toUploadError } from '../services/upload.js';

/**
 * POST /api/guest/transform: the "Try it" editor for visitors without an account.
 * Stateless on purpose: the photo comes in, the result goes straight back as bytes, and nothing is written to
 * Mongo or storage. So there's nothing to clean up, and no stranger's photo ever sits on our server.
 * The cost: the browser keeps both images, and each Apply sends the photo again.
 */
export async function guestTransform(req, res) {
  let result;
  try {
    // Same five formats as an upload. The type the browser claimed is only a label, so read the real header.
    // (Throws a plain Error, which toUploadError turns into UNSUPPORTED_FILE like any other unreadable file.)
    if (!detectFormat(await openImage(req.file.buffer).metadata())) throw new Error('Not an accepted format');
    result = await applyTransform(req.file.buffer, req.body.transformations);
  } catch (err) {
    throw toUploadError(err);
  }

  // no-store: a stranger's edited photo has no business sitting in a shared cache along the way.
  res.set('Cache-Control', 'no-store').type(result.meta.mimeType).send(result.buffer);
}

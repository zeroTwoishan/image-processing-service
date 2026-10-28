import { openImage } from './openImage.js';
import { detectFormat, FORMATS } from './formats.js';
import { ApiError } from '../utils/ApiError.js';

// Pure: bytes in, bytes out. No Express, no Mongo, no disk, so it can be tested with buffers alone and reused
// by guest mode (Phase 7). Input is assumed to have passed transformSchema already.

// The standard sepia matrix: each output channel is a mix of the input R, G and B. tint() only recolours
// the image; real sepia mixes channels, which is what recomb() does.
const SEPIA = [
  [0.393, 0.769, 0.189],
  [0.349, 0.686, 0.168],
  [0.272, 0.534, 0.131],
];

const DEFAULT_QUALITY = 80;

// Part of every cache key (services/cache.js). Bump it whenever this pipeline's output changes (a new default
// quality, a different sepia matrix...), so versions made by the old code are never reused for new requests.
export const TRANSFORM_VERSION = 1;

// The watermark goes inside an SVG, which is XML: an unescaped "<" or "&" makes Sharp fail to parse it (a 500),
// and a crafted text could inject SVG elements. Escape at the boundary where text meets markup.
const XML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
export const escapeXml = (text) => text.replace(/[&<>"']/g, (c) => XML_ENTITIES[c]);

// Bottom-right text, sized to the image: about 1/20 of the width, smaller for long text so it still fits.
// White with a soft dark outline, so it reads on light and dark photos.
function watermarkSvg(text, width, height) {
  const size = Math.max(10, Math.round(Math.min(width / 20, (1.5 * width) / text.length)));
  const pad = Math.round(size / 2);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<text x="${width - pad}" y="${height - pad}" text-anchor="end" font-family="DejaVu Sans, sans-serif" ` +
      `font-size="${size}" fill="white" fill-opacity="0.85" stroke="black" stroke-opacity="0.35" ` +
      `stroke-width="${Math.max(1, size / 16)}" paint-order="stroke">${escapeXml(text)}</text></svg>`,
  );
}

// "Empty or contradictory" (the error table's INVALID_TRANSFORM): a transform that changes nothing would
// only store a duplicate, and grayscale + sepia fight over the same pixels.
function checkTransform(t) {
  const changesSomething =
    t.rotate || t.flip || t.mirror || t.crop || t.resize || t.filters?.grayscale || t.filters?.sepia || t.watermark || t.format || t.compress;
  if (!changesSomething) throw new ApiError(400, 'INVALID_TRANSFORM', 'Choose at least one change');
  if (t.filters?.grayscale && t.filters?.sepia) {
    throw new ApiError(400, 'INVALID_TRANSFORM', 'Choose grayscale or sepia, not both');
  }
}

/**
 * Runs the fixed pipeline: auto-orient → rotate → flip/mirror → crop → resize → grayscale/sepia → watermark → format.
 * Animated GIF/AVIF use their first frame only, so the result is a still image.
 * Returns { buffer, meta: { format, ext, mimeType, width, height, size } }.
 */
export async function applyTransform(buffer, t) {
  checkTransform(t);

  const meta = await openImage(buffer, { pages: 1 }).metadata();

  // The crop is measured in the rotated frame: after 90° or 270° width and height swap, so a crop that fits the
  // original can fall outside the rotated image. Checked here so the user gets INVALID_CROP, not Sharp's
  // "bad extract area". autoOrient holds the size after the EXIF rotation, for files that still carry one.
  const upright = meta.autoOrient ?? meta;
  const quarterTurn = t.rotate === 90 || t.rotate === 270;
  const [w, h] = quarterTurn ? [upright.height, upright.width] : [upright.width, upright.height];
  if (t.crop && (t.crop.x + t.crop.width > w || t.crop.y + t.crop.height > h)) {
    throw new ApiError(400, 'INVALID_CROP', `The crop must fit inside the ${w}×${h} image (measured after rotation)`, { width: w, height: h });
  }

  // Sharp applies rotate/flip/extract/resize in the order they're called: extract() before resize() crops first.
  let img = openImage(buffer, { pages: 1 }).autoOrient();
  if (t.rotate) img = img.rotate(t.rotate);
  // Sharp runs flip/flop BEFORE rotate whatever the call order (its docs say otherwise). After a quarter turn,
  // flipping first and then rotating equals mirroring after the rotation, so swap them to get rotate → flip.
  const [topBottom, leftRight] = quarterTurn ? [t.mirror, t.flip] : [t.flip, t.mirror];
  if (topBottom) img = img.flip();
  if (leftRight) img = img.flop();
  if (t.crop) img = img.extract({ left: t.crop.x, top: t.crop.y, width: t.crop.width, height: t.crop.height });
  if (t.resize) {
    // Both sides → exactly that size (scale, then centre-crop the overflow). One side → aspect ratio kept.
    // Never enlarged: upscaling only adds blur and bytes.
    img = img.resize({ width: t.resize.width, height: t.resize.height, fit: 'cover', withoutEnlargement: true });
  }
  if (t.filters?.grayscale) img = img.grayscale();
  if (t.filters?.sepia) img = img.recomb(SEPIA);

  if (t.watermark) {
    // The text is sized to the final image, which is only known after rotate/crop/resize, so render those first.
    // shortcut: a raw pixel buffer costs up to ~100 MB at the 25 MP limit; fine at our sizes, measure first if RAM gets tight.
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    img = openImage(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).composite([
      { input: watermarkSvg(t.watermark.text, info.width, info.height) },
    ]);
  }

  const format = t.format ?? detectFormat(meta); // keep the original's format unless asked to change it
  const { ext, mimeType, encode } = FORMATS[format];
  const { data, info } = await encode(img, t.compress?.quality ?? DEFAULT_QUALITY).toBuffer({ resolveWithObject: true });
  return { buffer: data, meta: { format, ext, mimeType, width: info.width, height: info.height, size: data.length } };
}

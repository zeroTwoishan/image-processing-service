// The image formats we accept and produce, and how to encode each one. Shared by upload and transform,
// so there is exactly one list of formats.
export const FORMATS = {
  jpeg: { ext: 'jpg', mimeType: 'image/jpeg', encode: (img, quality) => img.jpeg({ quality }) },
  png: { ext: 'png', mimeType: 'image/png', encode: (img) => img.png() }, // lossless: quality doesn't apply
  webp: { ext: 'webp', mimeType: 'image/webp', encode: (img, quality) => img.webp({ quality }) },
  gif: { ext: 'gif', mimeType: 'image/gif', encode: (img) => img.gif() },
  avif: { ext: 'avif', mimeType: 'image/avif', encode: (img, quality) => img.avif({ quality }) },
};

// Sharp's format name → ours. AVIF shows up as "heif" because AVIF and iPhone HEIC share one container
// format; the compression tells them apart. We accept AVIF only (av1), not HEIC (hevc).
export function detectFormat({ format, compression }) {
  if (format === 'heif') return compression === 'av1' ? 'avif' : null;
  return Object.hasOwn(FORMATS, format) ? format : null;
}

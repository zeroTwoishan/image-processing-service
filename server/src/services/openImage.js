import sharp from 'sharp';

// 25 megapixels ≈ 100 MB of raw pixels. A tiny file can claim huge dimensions (a 400 KB PNG can be 30 MP of
// one colour) and would need gigabytes of RAM to decode. Sharp checks the header against this limit and
// refuses before decoding anything.
export const MAX_PIXELS = 25_000_000;

// Every sharp() call in the app goes through here, so the pixel limit can't be forgotten on one of them.
export const openImage = (input, options = {}) => sharp(input, { limitInputPixels: MAX_PIXELS, ...options });

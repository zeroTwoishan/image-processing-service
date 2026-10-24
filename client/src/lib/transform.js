// The edit panel's state, and its translation to and from the API's `transformations` body.
// Inputs hold strings ('' = left empty); the API wants numbers and only the fields that change something.
// Steps run in this fixed order on the server: rotate/flip → crop → resize → filters → watermark → output.

export const DEFAULT_QUALITY = 80; // the server's default too, so leaving the slider here sends nothing
export const LOSSLESS = ['png', 'gif']; // quality doesn't apply to these
// File extensions per format, the same as the server's FORMATS table (a version is named <name>.<ext>).
export const EXTENSIONS = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', avif: 'avif' };

/** Panel defaults for one photo: the output keeps the original's format. */
export const defaultTransform = (format) => ({
  rotate: 0, // 0 | 90 | 180 | 270
  flip: false, // vertical
  mirror: false, // horizontal
  crop: { x: '', y: '', width: '', height: '' },
  resize: { width: '', height: '' },
  filters: { grayscale: false, sepia: false },
  watermark: '',
  format,
  quality: DEFAULT_QUALITY,
});

const filled = (obj) => Object.values(obj).some((v) => v !== '' && v != null);
const num = (v) => (v === '' || v == null ? undefined : Number(v));
const qualityApplies = (t) => !LOSSLESS.includes(t.format) && t.quality !== DEFAULT_QUALITY;

/** The photo's size after rotation: 90° and 270° swap width and height. Crops are measured in this frame. */
export const rotatedSize = ({ width, height }, rotate) => (rotate % 180 ? { width: height, height: width } : { width, height });

/** The crop as numbers, or null when it's empty. */
export function cropRect(t) {
  if (!filled(t.crop)) return null;
  return { x: num(t.crop.x) ?? 0, y: num(t.crop.y) ?? 0, width: num(t.crop.width), height: num(t.crop.height) };
}

/** A message when the crop can't be applied, else null. Mirrors the server's INVALID_CROP check, but instantly. */
export function cropProblem(t, imageSize) {
  const c = cropRect(t);
  if (!c) return null;
  if (!c.width || !c.height) return 'Enter a width and a height to crop.';
  if (![c.x, c.y, c.width, c.height].every((v) => Number.isInteger(v) && v >= 0)) return 'Use whole numbers of pixels.';
  const frame = rotatedSize(imageSize, t.rotate);
  if (c.x + c.width > frame.width || c.y + c.height > frame.height) {
    return `The crop must fit inside ${frame.width}×${frame.height}${t.rotate % 180 ? ' (after rotation)' : ''}.`;
  }
  return null;
}

/** A message when a resize side can't be sent, else null. The server takes whole numbers from 1 to 10000. */
export function resizeProblem(t) {
  const sides = Object.values(t.resize).filter((v) => v !== '');
  const ok = sides.every((v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 10_000);
  return ok ? null : 'Use whole numbers of pixels from 1 to 10000.';
}

/** The crop if it can be applied, else the whole rotated photo; in rotated-frame pixels. */
export function croppedArea(t, imageSize) {
  const frame = rotatedSize(imageSize, t.rotate);
  return (!cropProblem(t, imageSize) && cropRect(t)) || { x: 0, y: 0, width: frame.width, height: frame.height };
}

/**
 * The part of the rotated photo that ends up in the file, in rotated-frame pixels: the crop (if it fits),
 * then the centre that a two-sided resize keeps. Sharp's fit 'cover' with withoutEnlargement first clamps
 * each target side to the area, then keeps the centred box with that shape.
 */
export function keptArea(t, imageSize) {
  const area = croppedArea(t, imageSize);
  const w = num(t.resize.width);
  const h = num(t.resize.height);
  if (!w || !h || resizeProblem(t)) return area; // one side keeps the shape, so nothing is cut
  const tw = Math.min(w, area.width);
  const th = Math.min(h, area.height);
  const scale = Math.max(tw / area.width, th / area.height);
  const keepW = tw / scale;
  const keepH = th / scale;
  return { x: area.x + (area.width - keepW) / 2, y: area.y + (area.height - keepH) / 2, width: keepW, height: keepH };
}

/** The size of the file Apply will make, so the Resize step can say "Result: 1200×900". Never enlarged. */
export function outputSize(t, imageSize) {
  const area = croppedArea(t, imageSize);
  const w = num(t.resize.width);
  const h = num(t.resize.height);
  if (resizeProblem(t) || (!w && !h)) return { width: area.width, height: area.height };
  if (w && h) return { width: Math.min(w, area.width), height: Math.min(h, area.height) }; // exact size, centre kept
  // Sharp never makes a side smaller than 1 px, even for a very thin crop.
  if (w) {
    const width = Math.min(w, area.width);
    return { width, height: Math.max(1, Math.round((area.height * width) / area.width)) };
  }
  const height = Math.min(h, area.height);
  return { width: Math.max(1, Math.round((area.width * height) / area.height)), height };
}

const asFields = (box) => ({ x: String(box.x), y: String(box.y), width: String(box.width), height: String(box.height) });

/**
 * Keeps a crop on the same part of the picture when the rotation changes. Each quarter turn clockwise maps
 * a box (x, y, w, h) in a W×H frame to (H − y − h, x, h, w) in the new H×W frame. An unfinished crop is kept as typed.
 *
 * With exactly one of flip / mirror on, the picture on screen is a reflection, and a clockwise step of the dial
 * turns what you see anticlockwise (reflect, turn, reflect back = the opposite turn). So the box turns the other way.
 */
export function rotateCrop(t, imageSize, newRotate) {
  const c = cropRect(t);
  if (!c || cropProblem(t, imageSize)) return t.crop;
  const step = t.flip !== t.mirror ? t.rotate - newRotate : newRotate - t.rotate;
  let frame = rotatedSize(imageSize, t.rotate);
  let box = c;
  for (let turns = (((step % 360) + 360) % 360) / 90; turns > 0; turns--) {
    box = { x: frame.height - box.y - box.height, y: box.x, width: box.height, height: box.width };
    frame = { width: frame.height, height: frame.width };
  }
  return asFields(box);
}

/**
 * Keeps a crop on the same part of the picture when Flip (top ↔ bottom) or Mirror (left ↔ right) is toggled:
 * the picture moves under the box, so the box moves with it.
 */
export function reflectCrop(t, imageSize, axis) {
  const c = cropRect(t);
  if (!c || cropProblem(t, imageSize)) return t.crop;
  const frame = rotatedSize(imageSize, t.rotate);
  return asFields(axis === 'mirror' ? { ...c, x: frame.width - c.x - c.width } : { ...c, y: frame.height - c.y - c.height });
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * Where the crop box ends up after a drag. `box` is the box when the drag started, dx/dy how far the pointer
 * has moved since, in photo pixels. `edge` is 'move' or the sides being dragged: 'n', 'se', 'w'… The box
 * stays inside the photo and never gets smaller than `min` photo pixels (or the photo, if that's smaller):
 * the crop box passes about 48 screen pixels' worth, so its grips never pile on top of each other.
 */
export function dragCrop(box, edge, dx, dy, frame, min = 16) {
  if (edge === 'move') {
    const x = Math.round(clamp(box.x + dx, 0, frame.width - box.width));
    const y = Math.round(clamp(box.y + dy, 0, frame.height - box.height));
    return { x, y, width: box.width, height: box.height };
  }
  const minW = Math.min(min, frame.width);
  const minH = Math.min(min, frame.height);
  let left = box.x;
  let top = box.y;
  let right = box.x + box.width;
  let bottom = box.y + box.height;
  if (edge.includes('w')) left = clamp(left + dx, 0, right - minW);
  if (edge.includes('e')) right = clamp(right + dx, left + minW, frame.width);
  if (edge.includes('n')) top = clamp(top + dy, 0, bottom - minH);
  if (edge.includes('s')) bottom = clamp(bottom + dy, top + minH, frame.height);
  // Round the edges, not the size, so the box can't spill one pixel past the photo.
  [left, top, right, bottom] = [left, top, right, bottom].map(Math.round);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Which steps differ from the defaults, i.e. what Apply will do. */
export function changedSteps(t, originalFormat) {
  return {
    rotate: t.rotate !== 0 || t.flip || t.mirror,
    crop: filled(t.crop),
    resize: filled(t.resize),
    filters: t.filters.grayscale || t.filters.sepia,
    watermark: t.watermark.trim() !== '',
    output: t.format !== originalFormat || qualityApplies(t),
  };
}

export const countChanges = (t, originalFormat) => Object.values(changedSteps(t, originalFormat)).filter(Boolean).length;

/** Short Geist Mono summaries shown at the right of each step. */
export function stepSummaries(t) {
  const c = t.crop;
  const rotate = [t.rotate ? `${t.rotate}°` : null, t.flip && 'flip', t.mirror && 'mirror'].filter(Boolean).join(' · ');
  const crop = filled(c) ? `${c.width || '?'}×${c.height || '?'} at ${c.x || 0},${c.y || 0}` : '';
  const resize = filled(t.resize) ? `${t.resize.width || 'auto'}×${t.resize.height || 'auto'}` : '';
  const filters = [t.filters.grayscale && 'grayscale', t.filters.sepia && 'sepia'].filter(Boolean).join(' · ');
  const watermark = t.watermark.trim() ? `“${t.watermark.trim()}”` : '';
  const output = LOSSLESS.includes(t.format) ? t.format : `${t.format} · ${t.quality}`;
  return { rotate, crop, resize, filters, watermark, output };
}

/** Panel state → the API body. Sends only what changes something; the server rejects a transform that changes nothing. */
export function toApiTransform(t, originalFormat) {
  const out = {};
  if (t.rotate) out.rotate = t.rotate;
  if (t.flip) out.flip = true;
  if (t.mirror) out.mirror = true;
  const crop = cropRect(t);
  if (crop) out.crop = crop;
  if (filled(t.resize)) out.resize = { width: num(t.resize.width), height: num(t.resize.height) }; // undefined sides are dropped by JSON
  if (t.filters.grayscale) out.filters = { grayscale: true };
  if (t.filters.sepia) out.filters = { sepia: true };
  if (t.watermark.trim()) out.watermark = { text: t.watermark.trim() };
  if (t.format !== originalFormat) out.format = t.format;
  if (qualityApplies(t)) out.compress = { quality: t.quality };
  return out;
}

/** The API's `transformations` (a version's recipe) → panel state, for "Edit from original". */
export function fromApiTransform(api, originalFormat) {
  const d = defaultTransform(originalFormat);
  if (!api) return d;
  const str = (v) => (v == null ? '' : String(v));
  return {
    ...d,
    rotate: api.rotate ?? 0,
    flip: !!api.flip,
    mirror: !!api.mirror,
    crop: api.crop ? { x: str(api.crop.x), y: str(api.crop.y), width: str(api.crop.width), height: str(api.crop.height) } : d.crop,
    resize: { width: str(api.resize?.width), height: str(api.resize?.height) },
    filters: { grayscale: !!api.filters?.grayscale, sepia: !!api.filters?.sepia },
    watermark: api.watermark?.text ?? '',
    format: api.format ?? originalFormat,
    quality: api.compress?.quality ?? DEFAULT_QUALITY,
  };
}

/** One line describing a version's edits: "90° · sepia · “© ishan” · webp · 80". */
export function describeEdits(api, originalFormat) {
  const t = fromApiTransform(api, originalFormat);
  const changed = changedSteps(t, originalFormat);
  const summary = stepSummaries(t);
  return Object.keys(changed)
    .filter((step) => changed[step])
    .map((step) => summary[step])
    .join(' · ');
}

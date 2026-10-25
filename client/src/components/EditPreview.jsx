import { useRef } from 'react';
import { croppedArea, keptArea, rotatedSize } from '../lib/transform';
import { cx } from '../lib/ui';
import { CropBox } from './CropBox';

const pct = (part, whole) => `${(part / whole) * 100}%`;

/**
 * Live preview of the pending edits, drawn by the browser on the original photo. Nothing is sent to the
 * server, so it updates on every click for free; Apply then makes the real file.
 *
 * - rotate / flip / mirror: a CSS transform. The frame takes the rotated shape, and the photo inside is sized
 *   with its sides swapped, then turned to fill it.
 * - grayscale / sepia: CSS filters (CSS sepia() uses the same colour matrix as the server).
 * - crop, and the centre a two-sided resize keeps: everything that won't be in the file is dimmed.
 * - watermark: the text drawn over the bottom-right of what's kept, sized like the server sizes it.
 * - a one-sided resize, format and quality change the file, not the look, so they have nothing to show.
 *
 * It's an approximation: the browser and Sharp round colours and fonts a little differently, and the
 * server's 10 px minimum font size isn't drawn (it only matters for results under ~200 px wide).
 *
 * cropping:     crop mode ("Crop on photo" until "Done"): the draggable box is on the photo. Outside crop mode a
 *               crop is still shown by dimming, but the photo isn't draggable, so swipes scroll the page on phones.
 * onCropChange: called with { x, y, width, height } in photo pixels as the box is dragged
 * edited:       whether there are pending edits, to show the "Preview" tag
 */
export function EditPreview({ src, alt, width, height, t, cropping = false, onCropChange, edited = true }) {
  const frameRef = useRef(null);
  const frame = rotatedSize({ width, height }, t.rotate);
  const cropBox = croppedArea(t, { width, height }); // the typed crop if it fits, else the whole photo
  const showCropBox = cropping && onCropChange;
  const quarterTurn = t.rotate % 180 !== 0;
  const kept = keptArea(t, { width, height }); // the area that becomes the file
  const trimmed = kept.width < frame.width || kept.height < frame.height;
  const text = t.watermark.trim();
  const fontShare = text ? Math.min(1 / 20, 1.5 / text.length) : 0; // of the result's width, the server's formula
  const filter = [t.filters.grayscale && 'grayscale(1)', t.filters.sepia && 'sepia(1)'].filter(Boolean).join(' ');
  const keptBox = { left: pct(kept.x, frame.width), top: pct(kept.y, frame.height), width: pct(kept.width, frame.width), height: pct(kept.height, frame.height) };

  return (
    // Shorter on phones (38% of the screen), so the photo, the tool under it and the edit bar fit on one screen.
    <div className="grid h-[38dvh] min-h-56 place-items-center lg:h-[min(68dvh,720px)] lg:min-h-72 overflow-hidden rounded-lg border border-line bg-surface p-4 @container-size">
      <div
        ref={frameRef}
        className="relative rounded-sm @container-size"
        style={{ aspectRatio: `${frame.width} / ${frame.height}`, width: `min(100cqw, 100cqh * ${frame.width / frame.height})` }}
      >
        {/* The photo and its overlays are clipped to the frame; the crop box is not, so its grips at the
            photo's edge keep their whole touch target (they spill into the stage's padding). */}
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <img
            src={src}
            alt={`${alt}, preview of your edits`}
            className="photo-edge absolute top-1/2 left-1/2 max-w-none transition-[transform,filter] duration-240 ease-out"
            style={{
              // Turned 90° or 270°, the photo's width has to equal the frame's height (and the other way round).
              width: quarterTurn ? '100cqh' : '100cqw',
              height: quarterTurn ? '100cqw' : '100cqh',
              // Read right to left: rotate first, then flip/mirror on screen axes, which is the server's order.
              transform: `translate(-50%, -50%) scale(${t.mirror ? -1 : 1}, ${t.flip ? -1 : 1}) rotate(${t.rotate}deg)`,
              filter: filter || undefined,
            }}
          />

          {trimmed && (
            <div
              aria-hidden="true"
              // The crop box draws its own outline; this one only marks a resize's centre crop.
              className={cx('pointer-events-none absolute shadow-[0_0_0_9999px_rgb(0_0_0/0.6)]', !showCropBox && 'outline-1 outline-fg/80')}
              style={keptBox}
            />
          )}

          {text && (
            <div aria-hidden="true" className="pointer-events-none absolute @container" style={keptBox}>
              <span
                className="absolute font-['DejaVu_Sans',sans-serif] leading-none whitespace-nowrap text-white/85 [text-shadow:0_0_2px_rgb(0_0_0/0.5)]"
                style={{ fontSize: `${fontShare * 100}cqw`, right: `${fontShare * 50}cqw`, bottom: `${fontShare * 50}cqw` }}
              >
                {text}
              </span>
            </div>
          )}

          {edited && (
            <span className="pointer-events-none absolute top-3 left-3 rounded-sm bg-canvas/80 px-1.5 py-0.5 text-xs text-fg">Preview</span>
          )}
        </div>

        {showCropBox && <CropBox box={cropBox} frame={frame} frameRef={frameRef} onChange={onCropChange} />}
      </div>
    </div>
  );
}

export default EditPreview;

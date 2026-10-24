import { useId, useState } from 'react';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { cx, ICON } from '../lib/ui';

const tag = 'pointer-events-none absolute top-3 rounded-sm bg-canvas/80 px-1.5 py-0.5 text-xs text-fg';

/**
 * The hero: the photo on a quiet stage, as large as the viewport allows.
 * With `afterSrc` it becomes a before/after comparison: drag the handle, or
 * focus it and use the arrow keys. Without it, it just shows `beforeSrc`.
 *
 * width / height: the image's pixel size, so the frame keeps its aspect ratio.
 * beforeWidth / beforeHeight: the before image's size, when it differs.
 * wipe: whether the pixels line up at all. A wipe only makes sense when every point of "after" sits where it
 * was in "before" (a filter, a watermark, a new format, a resize). A rotate, flip, mirror or crop moves the
 * picture, even when the shape stays the same, so then the two are shown side by side.
 */
export function CompareSlider({ beforeSrc, afterSrc, alt, width, height, beforeWidth = width, beforeHeight = height, wipe = true, initial = 50 }) {
  const id = useId();
  const [pos, setPos] = useState(initial);
  const ratio = width / height;
  // A two-sided resize can change the shape without moving anything else, so the shape is checked too.
  const sameShape = Math.abs(beforeWidth / beforeHeight - ratio) < 0.01;

  if (afterSrc && !(wipe && sameShape)) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SideFrame src={beforeSrc} alt={`${alt}, before`} label="Before" width={beforeWidth} height={beforeHeight} />
        <SideFrame src={afterSrc} alt={`${alt}, after`} label="After" width={width} height={height} />
      </div>
    );
  }

  return (
    <div className="grid h-[min(68dvh,720px)] min-h-72 place-items-center overflow-hidden rounded-lg border border-line bg-surface p-4 @container-size">
      <div
        className={cx(
          'relative overflow-hidden rounded-sm',
          afterSrc && 'cursor-ew-resize select-none has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-safelight',
        )}
        style={{ aspectRatio: `${width} / ${height}`, width: `min(100cqw, 100cqh * ${ratio})` }}
      >
        <img src={beforeSrc} alt={afterSrc ? `${alt}, before` : alt} className="photo-edge absolute inset-0 size-full object-contain" />

        {afterSrc && (
          <>
            <img
              src={afterSrc}
              alt={`${alt}, after`}
              className="photo-edge absolute inset-0 size-full object-contain"
              style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
            />
            <span className={cx(tag, 'left-3')}>Before</span>
            <span className={cx(tag, 'right-3')}>After</span>

            {/* divider + handle: drawn only; the range input below is the real control */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
              <div className="absolute inset-y-0 -left-px w-px bg-fg/80" />
              <div className="absolute top-1/2 -left-4.5 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-fg/70 bg-canvas/85 text-fg">
                <ArrowsLeftRightIcon size={ICON.sm} />
              </div>
            </div>

            <label htmlFor={id} className="sr-only">Compare before and after. Left shows before, right shows after.</label>
            <input
              id={id}
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-valuetext={`${pos}% before, ${100 - pos}% after`}
              className="absolute inset-0 size-full cursor-ew-resize opacity-0"
            />
          </>
        )}
      </div>
    </div>
  );
}

/** One labelled picture on its own stage, for the side-by-side comparison. */
function SideFrame({ src, alt, label, width, height }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      {/* Stacked on phones, so each is shorter: both should fit on one screen to compare them. */}
      <div className="grid h-[min(34dvh,560px)] min-h-48 place-items-center sm:h-[min(52dvh,560px)] overflow-hidden rounded-lg border border-line bg-surface p-4 @container-size">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="photo-edge rounded-sm object-contain"
          style={{ aspectRatio: `${width} / ${height}`, width: `min(100cqw, 100cqh * ${width / height})` }}
        />
      </div>
      <figcaption className="flex items-baseline justify-between gap-2 px-0.5 text-xs">
        <span className="text-fg">{label}</span>
        <span className="font-mono text-fg-subtle tabular-nums">
          {width}×{height}
        </span>
      </figcaption>
    </figure>
  );
}

export default CompareSlider;

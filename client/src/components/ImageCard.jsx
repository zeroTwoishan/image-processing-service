import { TimerIcon } from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router';
import { cx, focusRing, ICON } from '../lib/ui';
import { formatBytes, formatDimensions, formatDuration, HOUR } from '../lib/format';

const MAX_TILT = 2; // degrees, each axis

/** Very subtle pointer tilt. CSS only applies it under motion-safe. */
function tilt(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--ry', `${(x * 2 * MAX_TILT).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${(-y * 2 * MAX_TILT).toFixed(2)}deg`);
}
function untilt(e) {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
}

/**
 * One thumbnail in the gallery. Never loads the full image.
 * Expiry under 1 hour turns the timer TEXT safelight; there is no badge behind it.
 * image: the API's image object (expiresAt is an ISO string)
 * now:   from useNow() in the parent so every timer ticks together
 */
export function ImageCard({ image, now = Date.now() }) {
  const { search } = useLocation(); // "?page=2", handed to the photo page so "Your photos" returns here
  const msLeft = new Date(image.expiresAt) - now;
  const soon = msLeft < HOUR;

  return (
    <Link
      to={`/images/${image.id}`}
      state={{ gallerySearch: search }}
      onPointerMove={tilt}
      onPointerLeave={untilt}
      className={cx(
        'group @container flex flex-col gap-2.5 rounded-md transition-transform duration-150 ease-out perspective-[900px] active:scale-[0.97]',
        focusRing,
        'focus-visible:outline-offset-4',
      )}
    >
      <div
        className="overflow-hidden rounded-md bg-raised transition-transform duration-200 ease-out motion-safe:transform-[rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      >
        <img
          src={image.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="photo-edge size-full rounded-md object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-[13px] font-medium text-fg">{image.originalName}</h3>
          {image.parent && (
            <span className="shrink-0 rounded-sm border border-line-strong px-1 font-mono text-[11px] leading-4 text-fg-muted">
              Version
            </span>
          )}
        </div>
        <p className="flex flex-wrap gap-x-2 font-mono text-xs text-fg-subtle tabular-nums">
          <span className="whitespace-nowrap">{formatDimensions(image.width, image.height)}</span>
          <span className="whitespace-nowrap">{formatBytes(image.size)}</span>
        </p>
        <p className={cx('flex items-center gap-1 font-mono text-xs tabular-nums', soon ? 'text-safelight' : 'text-fg-muted')}>
          <TimerIcon size={ICON.sm} aria-hidden="true" className="shrink-0" />
          <span className="sr-only @min-[10.5rem]:not-sr-only">Expires in&nbsp;</span>
          <span className="whitespace-nowrap">{formatDuration(msLeft)}</span>
        </p>
      </div>
    </Link>
  );
}

export default ImageCard;

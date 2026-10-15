import { cx } from '../lib/ui';
import { formatAgo, formatBytes, formatDimensions, formatDuration, HOUR } from '../lib/format';

/**
 * The photo's facts in Geist Mono. Under 1 hour, the expiry value turns safelight (text only).
 * (From design-reference, adapted to the API's image object: size, createdAt, expiresAt as ISO strings.)
 * madeFrom: original file name when showing a version (Phase 3)
 */
export function ImageDetails({ image, now = Date.now(), madeFrom }) {
  const msLeft = new Date(image.expiresAt) - now;
  const rows = [
    ['Dimensions', formatDimensions(image.width, image.height)],
    ['Size', formatBytes(image.size)],
    ['Format', image.format.toUpperCase()],
    [madeFrom ? 'Made' : 'Uploaded', formatAgo(now - new Date(image.createdAt))],
    ['Expires in', formatDuration(msLeft), msLeft < HOUR],
    ...(madeFrom ? [['Made from', madeFrom]] : []),
  ];

  return (
    <section aria-labelledby="details-heading" className="flex flex-col gap-3">
      <h2 id="details-heading" className="text-sm font-medium text-fg">
        Details
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {rows.map(([label, value, soon]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-fg-subtle">{label}</dt>
            <dd className={cx('truncate font-mono text-[13px] tabular-nums', soon ? 'text-safelight' : 'text-fg')}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[13px] text-fg-subtle">Hidden location and camera data were removed on upload.</p>
    </section>
  );
}

export default ImageDetails;

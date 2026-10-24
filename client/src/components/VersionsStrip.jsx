import { Link } from 'react-router';
import { cx, focusRing } from '../lib/ui';
import { formatAgo } from '../lib/format';

/**
 * Under the hero: the original, then its versions newest first. (From design-reference, adapted to the API's
 * image objects and React Router links.)
 * versions:  [{ ...image, label: 'v2' }], newest first
 * currentId: the photo on screen (outlined, aria-current)
 * linkState: carried along on every link (so "Your photos" still returns to the right gallery page)
 */
export function VersionsStrip({ original, versions = [], currentId, now = Date.now(), linkState }) {
  const items = [
    { ...original, label: 'Original', meta: original.format },
    ...versions.map((v) => ({ ...v, meta: formatAgo(now - new Date(v.createdAt)) })),
  ];

  return (
    <section aria-labelledby="versions-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 id="versions-heading" className="text-sm font-medium text-fg">
          Versions
        </h2>
        <span className="font-mono text-xs text-fg-subtle tabular-nums">{versions.length}</span>
      </div>
      <ol className="-mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-2">
        {items.map((it) => {
          const current = it.id === currentId;
          return (
            <li key={it.id} className="shrink-0">
              <Link
                to={`/images/${it.id}`}
                state={linkState}
                aria-current={current ? 'page' : undefined}
                className={cx('group flex w-18 flex-col gap-1.5 rounded-md transition-transform duration-150 ease-out active:scale-[0.97]', focusRing)}
              >
                <span
                  className={cx(
                    'block h-24 overflow-hidden rounded-md bg-raised ring-offset-2 ring-offset-canvas',
                    current ? 'ring-1 ring-fg' : 'ring-1 ring-transparent group-hover:ring-line-strong',
                  )}
                >
                  <img src={it.thumbnailUrl} alt="" className="photo-edge size-full rounded-md object-cover" />
                </span>
                <span className={cx('font-mono text-xs', current ? 'text-fg' : 'text-fg-muted')}>{it.label}</span>
                <span className="truncate font-mono text-[11px] text-fg-subtle">{it.meta}</span>
              </Link>
            </li>
          );
        })}
        {versions.length === 0 && (
          <li className="flex max-w-[28ch] items-center text-[13px] text-fg-subtle">No versions yet. Apply an edit to make one.</li>
        )}
      </ol>
    </section>
  );
}

export default VersionsStrip;

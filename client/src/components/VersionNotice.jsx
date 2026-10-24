import { useEffect, useRef } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { cx, ICON, textLink } from '../lib/ui';
import { formatAgo } from '../lib/format';
import { describeEdits } from '../lib/transform';

/**
 * Replaces the transform panel while you look at a version. (From design-reference, adapted to the API.)
 * "Edit from original" opens the original with the panel already filled in with this version's edits, so
 * you can keep editing (add a crop to a rotation, say) without versions of versions.
 * version: the version on screen, plus its label ('v2'); original: its original
 */
export function VersionNotice({ version, original, now = Date.now(), linkState, focusOnMount = false }) {
  const edits = describeEdits(version.transformations, original.format);
  const headingRef = useRef(null);

  // Arriving here from Apply, the focused Apply button is gone. Move focus to this heading so keyboard and
  // screen-reader users land on the result instead of at the top of the page.
  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus();
  }, [focusOnMount]);

  return (
    <section aria-labelledby="version-heading" className="flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-6">
      <div className="flex flex-col gap-2">
        <h2 ref={headingRef} tabIndex={-1} id="version-heading" className="text-[15px] font-semibold text-fg focus:outline-none">
          You’re looking at {version.label}
        </h2>
        {/* wrap-anywhere: long phone file names have no spaces and would otherwise widen the page on phones. */}
        <p className="text-sm leading-relaxed wrap-anywhere text-fg-muted">
          Made {formatAgo(now - new Date(version.createdAt))} from {original.originalName}. Versions are kept as they are; new
          edits start from the original.
        </p>
      </div>
      {edits && <p className="font-mono text-xs wrap-anywhere text-fg-subtle tabular-nums">{edits}</p>}
      <Link
        to={`/images/${original.id}`}
        state={{ ...linkState, prefill: version.transformations }}
        className={cx(textLink, 'inline-flex min-h-11 w-fit items-center gap-1.5 text-sm')}
      >
        Edit from original
        <ArrowRightIcon size={ICON.sm} aria-hidden="true" />
      </Link>
    </section>
  );
}

export default VersionNotice;

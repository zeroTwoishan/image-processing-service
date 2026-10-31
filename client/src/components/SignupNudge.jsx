import { useEffect } from 'react';
import { Link } from 'react-router';
import { XIcon } from '@phosphor-icons/react';
import { cx, focusRing, ICON, pressable } from '../lib/ui';
import { buttonClass } from './Button';

/**
 * "Keep your photos with a free account": shown to a guest once, after their first download.
 * Not a modal: it never takes focus or blocks the page (a dialog would interrupt someone who just got what
 * they came for). The live region stays mounted, so screen readers announce the card politely when it appears.
 * Phones: a bottom sheet. Desktop: a card in the bottom-right corner.
 *
 * onDismiss: ×, "Not now" or Esc. The caller remembers it, so the card stays away for a week.
 */
export function SignupNudge({ open, onDismiss }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onDismiss();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end sm:inset-x-6 sm:bottom-6">
      {open && (
        <section
          aria-labelledby="nudge-title"
          className="pointer-events-auto relative flex w-full animate-enter flex-col gap-3 rounded-t-lg border border-line-strong bg-raised p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-lg sm:pb-5"
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className={cx('absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-md text-fg-subtle hover:bg-surface hover:text-fg', pressable, focusRing)}
          >
            <XIcon size={ICON.sm} aria-hidden="true" />
          </button>
          <h2 id="nudge-title" className="pr-10 text-[15px] font-medium text-fg">
            Keep your photos with a free account
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg-muted">
            <li>A gallery of everything you upload</li>
            <li>Every edit saved as a version you can compare</li>
            <li>Photos kept for 12 hours, then deleted for you</li>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/register" className={buttonClass('primary')}>
              Create account
            </Link>
            <Link to="/login" className={buttonClass('secondary')}>
              Log in
            </Link>
            <button type="button" onClick={onDismiss} className={buttonClass('ghost')}>
              Not now
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

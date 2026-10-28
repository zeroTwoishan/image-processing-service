import { useEffect, useState } from 'react';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { cx, focusRing, ICON, pressable } from '../lib/ui';

/**
 * Small confirmation in the bottom corner: "Uploaded", "Version created".
 * open:     show / hide (exit is shorter than the entrance)
 * message:  short past-tense statement, no exclamation marks
 * detail:   optional mono detail, e.g. a filename
 * duration: ms before onClose fires (0 = stays until dismissed)
 * inline:   render in the flow instead of fixed (for previews)
 * aboveSheet: on phones, sit above the editor's bottom bar
 *
 * The live region stays mounted so screen readers announce each new message.
 */
export function Toast({ open = false, message, detail, onClose, duration = 4000, inline = false, aboveSheet = false }) {
  const [shown, setShown] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setShown(true);
      setLeaving(false);
      return undefined;
    }
    if (!shown) return undefined;
    setLeaving(true);
    const id = setTimeout(() => { setShown(false); setLeaving(false); }, 150);
    return () => clearTimeout(id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !duration || !onClose) return undefined;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose, message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        inline ? 'flex' : 'pointer-events-none fixed inset-x-4 z-50 flex justify-end sm:inset-x-6 lg:bottom-6',
        // Phones: above the editor's bottom bar (about 117 px tall), not on top of Apply.
        !inline && (aboveSheet ? 'bottom-32' : 'bottom-4 sm:bottom-6'),
      )}
    >
      {shown && message && (
        <div
          className={cx(
            'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md border border-line-strong bg-raised py-1.5 pr-1.5 pl-3.5',
            leaving ? 'animate-exit' : 'animate-enter',
          )}
        >
          <CheckIcon size={ICON.md} aria-hidden="true" className="shrink-0 text-fg-muted" />
          <p className="min-w-0 flex-1 truncate text-sm text-fg">
            {message}
            {detail && <span className="font-mono text-[13px] text-fg-muted"> · {detail}</span>}
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className={cx('grid size-11 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface hover:text-fg', pressable, focusRing)}
            >
              <XIcon size={ICON.sm} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Toast;

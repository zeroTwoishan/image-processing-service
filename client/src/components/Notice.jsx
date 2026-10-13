import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { cx, ICON } from '../lib/ui';

/**
 * Inline message with an icon.
 * tone="danger":  rose edge, announced with role="alert"
 * tone="neutral": hairline edge, for timers and notes (role="note" unless `alert`)
 */
export function Notice({ tone = 'danger', icon, alert, children, action, className }) {
  const danger = tone === 'danger';
  const Icon = icon ?? (danger ? WarningCircleIcon : InfoIcon);
  const role = alert ?? danger ? 'alert' : 'note';
  return (
    <div
      role={role}
      className={cx(
        'flex animate-enter items-start gap-3 rounded-md border px-3.5 py-3 text-sm',
        danger ? 'border-danger/35 bg-danger/[0.06]' : 'border-line-strong bg-surface',
        className,
      )}
    >
      <Icon size={ICON.md} weight="regular" aria-hidden="true" className={cx('shrink-0', danger ? 'text-danger' : 'text-fg-muted')} />
      <div className="min-w-0 flex-1 pt-px text-fg">{children}</div>
      {action}
    </div>
  );
}

export default Notice;

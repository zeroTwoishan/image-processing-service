import { cx, focusRing, ICON, pressable } from '../lib/ui';
import { Spinner } from './Spinner';

const variants = {
  // The only filled safelight shape in the app. Use once per screen, for "do this".
  primary: 'bg-safelight text-safelight-ink hover:bg-safelight-hover disabled:bg-raised disabled:text-fg-subtle',
  secondary:
    'border border-line-strong bg-transparent text-fg hover:border-control-edge hover:bg-raised disabled:text-fg-subtle disabled:hover:border-line-strong disabled:hover:bg-transparent',
  ghost: 'text-fg-muted hover:bg-raised hover:text-fg disabled:text-fg-subtle disabled:hover:bg-transparent',
};

// A button's look for something that isn't a <button>, such as a router <Link> that should read as an action.
export const buttonClass = (variant = 'primary', className) =>
  cx('inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium', variants[variant], pressable, focusRing, className);

/**
 * variant: 'primary' | 'secondary' | 'ghost'
 * busy:    spinner + busyLabel, aria-busy, disabled. A busy or disabled primary
 *          button drops its safelight fill: only a clickable primary is filled.
 * icon / iconRight: Phosphor icon components
 */
export function Button({
  variant = 'primary',
  busy = false,
  busyLabel,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={buttonClass(variant, cx('disabled:cursor-not-allowed', busy && 'disabled:text-fg-muted', className))}
      {...rest}
    >
      {busy ? <Spinner /> : Icon && <Icon size={ICON.md} weight="regular" aria-hidden="true" />}
      <span>{busy && busyLabel ? busyLabel : children}</span>
      {!busy && IconRight && <IconRight size={ICON.md} weight="regular" aria-hidden="true" />}
    </button>
  );
}

export default Button;

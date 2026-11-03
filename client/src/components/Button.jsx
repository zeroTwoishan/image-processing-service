import { cx, focusRing, ICON, pressable } from '../lib/ui';
import { Spinner } from './Spinner';

const variants = {
  // The one lit shape on a screen: a gradient "bulb" with a soft glow. Use once per screen, for "do this".
  primary:
    'bg-safelight-gradient text-safelight-ink font-semibold shadow-safelight hover:brightness-110 disabled:bg-none disabled:bg-raised disabled:text-fg-subtle disabled:shadow-none disabled:hover:brightness-100',
  // Frosted outline: reads as a real button on photos and on the dark canvas alike.
  secondary:
    'border border-white/10 bg-white/[0.04] font-medium text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] hover:border-white/20 hover:bg-white/[0.08] disabled:text-fg-subtle disabled:hover:border-white/10 disabled:hover:bg-white/[0.04]',
  // Paper-white: the navbar's Sign up, so it doesn't compete with the page's one lit button.
  light: 'bg-fg font-semibold text-canvas shadow-[inset_0_-1px_0_rgb(0_0_0/0.15)] hover:bg-white disabled:bg-raised disabled:text-fg-subtle',
  ghost: 'font-medium text-fg-muted hover:bg-white/[0.06] hover:text-fg disabled:text-fg-subtle disabled:hover:bg-transparent',
};

const sizes = {
  sm: 'min-h-9 px-3.5 text-[13px]',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-[15px]',
};

// A button's look for something that isn't a <button>, such as a router <Link> that should read as an action.
export const buttonClass = (variant = 'primary', className, size = 'md') =>
  cx('inline-flex items-center justify-center gap-2 rounded-md whitespace-nowrap', sizes[size], variants[variant], pressable, focusRing, className);

/**
 * variant: 'primary' | 'secondary' | 'light' | 'ghost'
 * size:    'sm' (36px, navbar) | 'md' (default, 44px) | 'lg' (48px, landing page)
 * busy:    spinner + busyLabel, aria-busy, disabled. A busy or disabled primary
 *          button drops its safelight fill: only a clickable primary is filled.
 * icon / iconRight: Phosphor icon components
 */
export function Button({
  variant = 'primary',
  size = 'md',
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
      className={buttonClass(variant, cx('disabled:cursor-not-allowed', busy && 'disabled:text-fg-muted', className), size)}
      {...rest}
    >
      {busy ? <Spinner /> : Icon && <Icon size={ICON.md} weight="regular" aria-hidden="true" />}
      <span>{busy && busyLabel ? busyLabel : children}</span>
      {!busy && IconRight && <IconRight size={ICON.md} weight="regular" aria-hidden="true" />}
    </button>
  );
}

export default Button;

import { cx, focusRing, ICON, pressable } from '../lib/ui';

/** On/off button (aria-pressed). Pressed is a neutral raised state, never the accent. */
export function ToggleButton({ pressed, onChange, icon: Icon, children, disabled, className }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onChange?.(!pressed)}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm disabled:cursor-not-allowed',
        pressed
          ? 'border-fg-subtle bg-raised text-fg'
          : 'border-line-strong text-fg-muted hover:border-control-edge hover:text-fg',
        pressable,
        focusRing,
        className,
      )}
    >
      {Icon && <Icon size={ICON.md} aria-hidden="true" className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
}

export default ToggleButton;

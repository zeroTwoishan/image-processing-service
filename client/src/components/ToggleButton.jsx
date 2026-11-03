import { cx, focusRing, ICON, pressable } from '../lib/ui';

/** On/off button (aria-pressed). Pressed gets a faint safelight tint and edge, plus the edge change, not colour alone. */
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
          ? 'border-safelight/55 bg-safelight/[0.1] font-medium text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]'
          : 'border-white/10 bg-white/[0.02] text-fg-muted hover:border-white/20 hover:text-fg',
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

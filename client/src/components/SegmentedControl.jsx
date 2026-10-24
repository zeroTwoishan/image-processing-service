import { useId } from 'react';
import { cx } from '../lib/ui';

/**
 * One-of-many choice as a radio group (arrow keys move between options).
 * options: [{ value, label }]
 */
export function SegmentedControl({ legend, options, value, onChange, mono = false, disabled = false }) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div
        className="grid gap-1 rounded-md border border-line-strong p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'grid min-h-10 cursor-pointer place-items-center rounded-sm text-sm transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97]',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-safelight has-disabled:cursor-not-allowed',
                mono && 'font-mono',
                // Not colour alone: the chosen option also gets an edge and a heavier weight (WCAG 1.4.1 / 1.4.11).
                checked ? 'bg-raised font-medium text-fg ring-1 ring-control-edge' : 'text-fg-subtle hover:text-fg-muted',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange?.(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default SegmentedControl;

import { useId } from 'react';
import { cx } from '../lib/ui';

const ANGLES = [0, 90, 180, 270];

// Where each detent label sits around the dial (0° at the top, clockwise).
const POSITION = {
  0: 'top-0 left-1/2 -translate-x-1/2',
  90: 'right-0 top-1/2 -translate-y-1/2',
  180: 'bottom-0 left-1/2 -translate-x-1/2',
  270: 'left-0 top-1/2 -translate-y-1/2',
};

const TICK = {
  0: 'top-[40px] left-1/2 h-2 w-px -translate-x-1/2',
  90: 'right-[40px] top-1/2 h-px w-2 -translate-y-1/2',
  180: 'bottom-[40px] left-1/2 h-2 w-px -translate-x-1/2',
  270: 'left-[40px] top-1/2 h-px w-2 -translate-y-1/2',
};

/**
 * Rotate dial with four detents: 0 / 90 / 180 / 270.
 * It is a radio group underneath, so arrow keys step through the detents and
 * screen readers announce "90°, 2 of 4". The knob turns and settles on the
 * chosen detent.
 */
export function RotateDial({ value = 0, onChange, disabled = false }) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">Rotate</legend>
      <div className="relative size-[168px] shrink-0">
        <div aria-hidden="true" className="absolute inset-[40px] rounded-full border border-line-strong bg-surface" />
        {ANGLES.map((deg) => (
          <span key={deg} aria-hidden="true" className={cx('absolute bg-control-edge', TICK[deg])} />
        ))}
        <div
          aria-hidden="true"
          className="absolute inset-[54px] rounded-full border border-control-edge bg-raised transition-transform duration-[240ms] ease-out"
          style={{ transform: `rotate(${value}deg)` }}
        >
          <span className="absolute top-1.5 left-1/2 h-4 w-0.5 -translate-x-1/2 rounded-full bg-fg" />
        </div>
        {ANGLES.map((deg) => {
          const checked = value === deg;
          return (
            <label
              key={deg}
              className={cx(
                'absolute grid size-11 cursor-pointer place-items-center rounded-md font-mono text-xs tabular-nums',
                'transition-[color,scale] duration-150 ease-out active:scale-[0.97]',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-0 has-focus-visible:outline-safelight',
                'has-disabled:cursor-not-allowed',
                checked ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted',
                POSITION[deg],
              )}
            >
              <input
                type="radio"
                name={name}
                value={deg}
                checked={checked}
                onChange={() => onChange?.(deg)}
                className="sr-only"
              />
              {deg}°
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default RotateDial;

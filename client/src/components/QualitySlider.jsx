import { useId } from 'react';
import { cx } from '../lib/ui';

const MIN = 5;
const MAX = 100;
const STEP = 5;
const NOTCHES = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => MIN + i * STEP);

// Thumb styles for the native range input (WebKit + Firefox). Neutral, never the accent.
const thumb = cx(
  'appearance-none bg-transparent',
  '[&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-canvas [&::-webkit-slider-thumb]:bg-fg',
  '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-out',
  '[&:hover::-webkit-slider-thumb]:scale-110 [&:active::-webkit-slider-thumb]:scale-[0.97]',
  '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-canvas [&::-moz-range-thumb]:bg-fg',
);

/**
 * Output quality, 5–100 in steps of 5. Every step has a notch under the rail
 * (taller at 25 / 50 / 75 / 100) and the thumb snaps to them.
 */
export function QualitySlider({ value = 80, onChange, disabled = false }) {
  const id = useId();
  const fraction = (value - MIN) / (MAX - MIN);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-fg">Quality</label>
        <output htmlFor={id} className="font-mono text-[13px] text-fg tabular-nums">{value}</output>
      </div>
      <div className="relative h-11">
        {/* rail + filled part (thin lines, inset by the thumb radius so they meet its centre) */}
        <div aria-hidden="true" className="absolute inset-x-2.25 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line-strong" />
        <div
          aria-hidden="true"
          className="absolute inset-x-2.25 top-1/2 h-0.5 origin-left rounded-full bg-fg-muted transition-transform duration-150 ease-out"
          style={{ transform: `translateY(-50%) scaleX(${fraction})` }}
        />
        {/* notches */}
        <div aria-hidden="true" className="absolute inset-x-2.25 top-[calc(50%+8px)] flex justify-between">
          {NOTCHES.map((n) => (
            <span key={n} className={cx('w-px', n % 25 === 0 ? 'h-2 bg-control-edge' : 'h-1 bg-line-strong')} />
          ))}
        </div>
        <input
          id={id}
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className={cx(
            'relative h-11 w-full cursor-pointer rounded-sm disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight',
            thumb,
          )}
        />
      </div>
      <div aria-hidden="true" className="flex justify-between text-xs text-fg-subtle">
        <span>Smaller file</span>
        <span>Sharper</span>
      </div>
    </div>
  );
}

export default QualitySlider;

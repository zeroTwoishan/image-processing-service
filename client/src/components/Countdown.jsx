import { formatClock } from '../lib/format';

/**
 * Renders `seconds` as "0:42" in Geist Mono with tabular figures, so the
 * digits don't jitter. Drive it with useCountdown(retryAfterSeconds).
 * Hidden from screen readers: the surrounding message announces once instead.
 */
export function Countdown({ seconds, className = 'font-mono tabular-nums' }) {
  return (
    <time aria-hidden="true" dateTime={`PT${Math.max(0, Math.ceil(seconds))}S`} className={className}>
      {formatClock(seconds)}
    </time>
  );
}

export default Countdown;

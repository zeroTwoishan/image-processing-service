import { TimerIcon } from '@phosphor-icons/react';
import { useCountdown } from '../hooks/useCountdown';
import { Countdown } from './Countdown';
import { Notice } from './Notice';

/**
 * "Too many attempts. Try again in 0:42." with a live countdown.
 *
 * seconds:    the server's Retry-After, in seconds
 * restartKey: change it per 429 if the same Retry-After can repeat
 * lead:       the first sentence ("Too many attempts." / "Slow down.")
 *
 * Screen readers hear the sentence once (not every tick), then a polite
 * "You can try again now." when the timer reaches 0:00.
 * Pages that must also lock a form call useCountdown() themselves with the same values.
 */
export function RateLimitNotice({ seconds, restartKey, lead = 'Too many attempts.' }) {
  const remaining = useCountdown(seconds, restartKey);
  if (seconds <= 0) return null;
  if (remaining <= 0) {
    return (
      <p role="status" className="text-sm text-fg-muted">
        You can try again now.
      </p>
    );
  }
  return (
    <Notice tone="neutral" icon={TimerIcon} alert>
      <p>
        {lead} Try again in <Countdown seconds={remaining} className="font-mono font-medium text-fg tabular-nums" />
        <span aria-hidden="true">.</span>
        <span className="sr-only">{` ${seconds} seconds.`}</span>
      </p>
    </Notice>
  );
}

export default RateLimitNotice;

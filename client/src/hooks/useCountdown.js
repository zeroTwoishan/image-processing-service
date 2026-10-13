import { useEffect, useState } from 'react';

/**
 * Counts down once a second from `seconds` (e.g. a 429's Retry-After) to 0
 * and returns what's left.
 *
 * The countdown restarts when `seconds` changes, or when `restartKey` changes
 * (pass something unique per 429, like the response time, in case two
 * responses carry the same Retry-After).
 */
export function useCountdown(seconds = 0, restartKey) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds, restartKey]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const id = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  return remaining;
}

export default useCountdown;

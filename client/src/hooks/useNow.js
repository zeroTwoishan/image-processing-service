import { useEffect, useState } from 'react';

/** Re-renders every `intervalMs` with the current time, so expiry timers tick together. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default useNow;

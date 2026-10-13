import { useEffect, useState } from 'react';

// const [secondsLeft, start] = useCountdown(); start(42) → secondsLeft ticks 42, 41, … 0.
export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return [secondsLeft, setSecondsLeft];
}

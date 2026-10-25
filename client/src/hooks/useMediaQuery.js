import { useCallback, useSyncExternalStore } from 'react';

/**
 * true while the media query matches, e.g. useMediaQuery('(min-width: 64rem)') for Tailwind's lg.
 * useSyncExternalStore is React's way to read something that lives outside React (here, the window size)
 * without a flash of the wrong value or a missed change.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export default useMediaQuery;

import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import { scrollToTop } from '../lib/ui';

/**
 * Starts every newly opened page at the top. React Router swaps the page but leaves the window's scroll position
 * alone, so a photo opened from far down the gallery would open scrolled down too.
 *
 * - Instant, not smooth: the new page fades in (see Layout), so the eye doesn't see content fly past.
 * - Skipped for Back / Forward ("POP"): the browser puts you back where you were, which is what people expect.
 * - Skipped for links to a section (/#features): the page scrolls to that section itself.
 * - useLayoutEffect: runs before the browser paints the new page, so it never flashes at the old position.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (hash || navigationType === 'POP') return;
    scrollToTop({ smooth: false });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- only a change of page should scroll

  return null;
}

export default ScrollToTop;

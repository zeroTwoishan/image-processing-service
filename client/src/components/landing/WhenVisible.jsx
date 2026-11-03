import { useEffect, useRef, useState } from 'react';

/**
 * Renders its children only when this spot comes within ~one screen of the viewport (an IntersectionObserver).
 * Until then it's an empty box of `minHeight`, so the page keeps roughly its length and the scrollbar doesn't jump.
 *
 * Why: the landing page's lower sections and the animated editor mock are a lot of components and animations.
 * Building them all on load made the first seconds busy (Lighthouse's "Total Blocking Time"), for things most
 * visitors hadn't scrolled to yet.
 *
 * id:    stays on the wrapper even before the content exists, so links like /#features still have a target
 * eager:  render straight away (e.g. the page was opened at /#features)
 * margin: how far outside the screen to start (default 250px)
 */
export function WhenVisible({ id, minHeight, eager = false, margin = '250px', className, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(eager);

  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, margin]);

  return (
    <div ref={ref} id={id} className={className} style={shown ? undefined : { minHeight }}>
      {shown && children}
    </div>
  );
}

export default WhenVisible;

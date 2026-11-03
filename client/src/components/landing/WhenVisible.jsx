import { Suspense, useEffect, useRef, useState } from 'react';
import { cx } from '../../lib/ui';

/*
 * Background mounting. After the page has loaded and gone quiet, each WhenVisible on the page renders its
 * content one at a time, top to bottom, in the browser's idle moments. So by the time someone scrolls down,
 * the sections are usually already there and the page has its real height. (Scrolling near one first still
 * renders it straight away.)
 */
const queue = [];
let draining = false;
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 60));
function drain() {
  const next = queue.shift();
  if (!next) {
    draining = false;
    return;
  }
  next();
  idle(drain);
}
function enqueue(fn) {
  queue.push(fn);
  if (draining) return;
  draining = true;
  const start = () => setTimeout(() => idle(drain), 600);
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

/**
 * Renders its children later than the rest of the page: when the browser is idle after load, or as soon as the
 * spot comes near the screen, whichever is first. Keeps the first load light (the lower sections and the
 * animated editor mock were most of the work) without the page jumping.
 *
 * reserve: Tailwind classes for the box's height until the content arrives, per screen size, measured from the
 *          real section (e.g. "min-h-[2320px] md:min-h-[1404px]"). Close sizes are what stop the scroll jump:
 *          if a short placeholder suddenly became a tall section, everything below would be pushed down.
 * id:      stays on the wrapper even before the content exists, so links like /#features always have a target
 * eager:   render straight away (e.g. the page was opened at /#features)
 * margin:  how far outside the screen "near" starts (default 400px)
 */
export function WhenVisible({ id, reserve, eager = false, margin = '400px', className, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(eager);

  useEffect(() => {
    if (shown) return undefined;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
    };
    enqueue(show);
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && show(), { rootMargin: `${margin} 0px` });
    io.observe(el);
    return () => {
      done = true; // unmounted: the queued callback becomes a no-op
      io.disconnect();
    };
  }, [shown, margin]);

  return (
    <div ref={ref} id={id} className={cx(className, !shown && reserve)}>
      {/* Lazy sections download their code when first rendered: keep the reserved height until it's here */}
      {shown && <Suspense fallback={<div className={reserve} />}>{children}</Suspense>}
    </div>
  );
}

export default WhenVisible;

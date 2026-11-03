import { cx } from '../../lib/ui';

// A strip of 35 mm film: frames with sprocket holes and edge print, scrolling forever (CSS marquee).
const FRAMES = [
  ['dusk', 'none'],
  ['bokeh', 'saturate(1.2)'],
  ['dunes', 'sepia(0.8)'],
  ['peak', 'none'],
  ['forest', 'grayscale(1) contrast(1.1)'],
  ['sunrise', 'none'],
  ['neon', 'saturate(1.3)'],
  ['dusk', 'grayscale(1)'],
  ['dunes', 'none'],
  ['sunrise', 'sepia(0.7)'],
];

const sprockets =
  'bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgb(11_10_9)_10px_22px,transparent_22px_32px)]';

function Strip({ hidden }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 gap-0">
      {FRAMES.map(([img, filter], n) => (
        <li key={n} className="flex shrink-0 flex-col bg-[#17120f] px-1.5">
          <div className={cx('h-4', sprockets)} />
          <div className="flex items-center justify-between px-0.5 pb-1 font-mono text-[9px] tracking-wider text-amber/70">
            <span>DARKROOM 400</span>
            <span>▸ {String(n + 1).padStart(2, '0')}A</span>
          </div>
          <img
            src={`/showcase/${img}.webp`}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-32 w-48 rounded-[3px] object-cover sm:h-40 sm:w-60"
            style={{ filter }}
          />
          <div className={cx('mt-1.5 h-4', sprockets)} />
        </li>
      ))}
    </ul>
  );
}

/** Decorative, slightly tilted film strip between the hero and the features. Pauses on hover. */
export function FilmStrip() {
  return (
    <div aria-hidden="true" className="relative -rotate-2 py-6">
      <div className="flex w-max animate-marquee will-change-transform hover:[animation-play-state:paused]">
        <Strip />
        <Strip hidden />
      </div>
      {/* Edge fades: two gradient strips in the page colour, cheaper than masking the moving strip */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-canvas to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-canvas to-transparent" />
    </div>
  );
}

export default FilmStrip;

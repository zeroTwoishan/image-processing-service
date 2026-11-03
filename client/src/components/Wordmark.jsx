import { cx } from '../lib/ui';

/**
 * The mark: an aperture of six blades around a lit safelight centre. Pure SVG, so it stays sharp and takes
 * no request. `spinning` turns the blades slowly (loading screens).
 */
export function ApertureMark({ className, spinning = false }) {
  const blades = Array.from({ length: 6 }, (_, i) => i * 60);
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cx('shrink-0', className)}>
      <defs>
        <radialGradient id="dr-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffd2a1" />
          <stop offset="45%" stopColor="#ff6a3d" />
          <stop offset="100%" stopColor="#c8261c" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="#1c1917" stroke="rgb(255 255 255 / 0.14)" />
      <g className={cx('origin-center', spinning && 'animate-spin-slow')} style={{ transformBox: 'fill-box' }}>
        {blades.map((deg) => (
          <path
            key={deg}
            d="M16 3.5 L22.5 9.2 L16 12.4 Z"
            fill="rgb(246 240 233 / 0.16)"
            stroke="rgb(246 240 233 / 0.35)"
            strokeWidth="0.6"
            strokeLinejoin="round"
            transform={`rotate(${deg} 16 16)`}
          />
        ))}
      </g>
      <circle cx="16" cy="16" r="5" fill="url(#dr-core)" />
      <circle cx="14.6" cy="14.6" r="1.3" fill="#fff" opacity="0.55" />
    </svg>
  );
}

/** "Darkroom": the aperture mark + the name in Geist, with "room" in Instrument Serif italic. */
export function Wordmark({ className, mark = true }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 text-[19px] leading-none font-semibold tracking-[-0.03em] text-fg', className)}>
      {mark && <ApertureMark className="size-7" />}
      <span>
        Dark<span className="font-display text-[1.18em] font-normal italic tracking-[-0.01em]">room</span>
      </span>
    </span>
  );
}

export default Wordmark;

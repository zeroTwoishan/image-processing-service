import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CircleHalfIcon,
  CropIcon,
  FileImageIcon,
  LightningIcon,
  ShieldCheckIcon,
  TextTIcon,
} from '@phosphor-icons/react';
import { cx } from '../../lib/ui';

// The demo "plays" the real editor's steps, in the order the server runs them. Each frame is cumulative.
const FRAMES = [
  { label: 'Original', icon: FileImageIcon, size: 412, fmt: 'jpeg' },
  { label: 'Rotate 90°', icon: ArrowClockwiseIcon, size: 412, fmt: 'jpeg', rotate: 90 },
  { label: 'Crop 4:5', icon: CropIcon, size: 338, fmt: 'jpeg', rotate: 90, crop: true },
  { label: 'Sepia', icon: CircleHalfIcon, size: 331, fmt: 'jpeg', rotate: 90, crop: true, filter: 'sepia(0.9) saturate(1.15) contrast(1.05)' },
  { label: '© watermark', icon: TextTIcon, size: 334, fmt: 'jpeg', rotate: 90, crop: true, filter: 'sepia(0.9) saturate(1.15) contrast(1.05)', wm: true },
  { label: 'AVIF · q70', icon: LightningIcon, size: 61, fmt: 'avif', rotate: 90, crop: true, filter: 'sepia(0.9) saturate(1.15) contrast(1.05)', wm: true },
];
const LAST = FRAMES.length - 1;
const spring = { type: 'spring', stiffness: 120, damping: 20 };

/**
 * The landing page's "product shot": a mock of the editor window that plays through a real edit
 * (Raycast / Linear put the product itself in the hero). It tilts back in 3D and flattens as you scroll.
 * Purely decorative, so the whole thing is aria-hidden; the page's text says what it shows.
 */
export function HeroShowcase() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [i, setI] = useState(reduce ? LAST : 0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % FRAMES.length), 1900);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.25'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const f = FRAMES[i];
  const saved = Math.round((1 - f.size / FRAMES[0].size) * 100);

  return (
    <div ref={ref} aria-hidden="true" className="relative mx-auto w-full max-w-5xl [perspective:1400px]">
      {/* The light the window sits in */}
      <div className="absolute -inset-x-10 top-10 -bottom-10 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.35),transparent)]" />

      <m.div style={reduce ? undefined : { rotateX, scale, transformOrigin: 'center top' }} className="card relative overflow-hidden rounded-xl">
        {/* Window chrome */}
        <div className="flex h-11 items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="size-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <p className="flex-1 truncate text-center font-mono text-[11px] text-fg-subtle">
            darkroom <span className="text-fg-subtle/50">/</span> <span className="text-fg-muted">dunes_at_noon.{f.fmt === 'avif' ? 'avif' : 'jpg'}</span>
          </p>
          <span className="rounded-sm border border-white/10 px-1.5 font-mono text-[10px] leading-4 text-fg-muted">v{Math.max(1, i)}</span>
        </div>

        <div className="grid md:grid-cols-[1fr_230px]">
          {/* Stage */}
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-[#0d0c0b] bg-dots md:aspect-auto md:h-[440px]">
            <m.div
              className="relative aspect-square h-[78%] overflow-hidden rounded-md shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]"
              animate={{ rotate: f.rotate ?? 0 }}
              transition={spring}
            >
              <m.img
                src="/showcase/dunes.webp"
                alt=""
                width="800"
                height="800"
                fetchPriority="high"
                className="size-full object-cover"
                animate={{ filter: f.filter ?? 'none' }}
                transition={{ duration: 0.6 }}
              />
            </m.div>

            {/* Crop box (drawn in screen space, after the rotation, like the real editor) */}
            <AnimatePresence>
              {f.crop && (
                <m.div
                  key="crop"
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="pointer-events-none absolute top-1/2 left-1/2 aspect-[4/5] h-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-white/90 shadow-[0_0_0_9999px_rgb(11_10_9/0.62)]"
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }, (_, n) => (
                      <span key={n} className="border-[0.5px] border-white/20" />
                    ))}
                  </div>
                  {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => (
                    <span key={pos} className={cx('absolute size-2.5 rounded-[2px] bg-white', pos)} />
                  ))}
                  <AnimatePresence>
                    {f.wm && (
                      <m.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-2.5 bottom-2 font-display text-[15px] text-white/85 italic drop-shadow"
                      >
                        © ishan
                      </m.span>
                    )}
                  </AnimatePresence>
                </m.div>
              )}
            </AnimatePresence>

            {/* Current step badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 py-1 pr-3 pl-1.5 backdrop-blur">
              <span className="grid size-5 place-items-center rounded-full bg-safelight-gradient text-safelight-ink">
                <f.icon size={12} weight="bold" />
              </span>
              <AnimatePresence mode="wait">
                <m.span
                  key={f.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="font-mono text-[11px] text-fg"
                >
                  {f.label}
                </m.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Side panel: the six steps (desktop only) */}
          <div className="hidden flex-col border-l border-white/[0.06] md:flex">
            <p className="border-b border-white/[0.06] px-4 py-3 text-[13px] font-semibold text-fg">Edit</p>
            <ol className="flex flex-1 flex-col gap-0.5 p-2">
              {FRAMES.slice(1).map((s, n) => {
                const done = n + 1 <= i;
                const now = n + 1 === i;
                return (
                  <li
                    key={s.label}
                    className={cx(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] transition-colors duration-300',
                      now ? 'bg-white/[0.06] text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle/70',
                    )}
                  >
                    <span className="w-3 font-mono text-[10px] text-fg-subtle">{n + 1}</span>
                    <s.icon size={14} />
                    <span className="flex-1">{s.label}</span>
                    <span className={cx('size-1.5 rounded-full transition-all duration-300', done ? 'bg-safelight safelight-glow' : 'bg-white/10')} />
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-col gap-2.5 border-t border-white/[0.06] p-3">
              <div className="flex items-baseline justify-between font-mono text-[11px]">
                <span className="text-fg-subtle">Output</span>
                <span className="text-fg tabular-nums">
                  <m.span key={f.size}>{f.size}</m.span> KB
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <m.div
                  className="h-full rounded-full bg-safelight-gradient"
                  animate={{ width: `${(f.size / FRAMES[0].size) * 100}%` }}
                  transition={spring}
                />
              </div>
              <div className="flex h-8 items-center justify-center rounded-md bg-safelight-gradient text-[12px] font-semibold text-safelight-ink shadow-safelight">
                {i === 0 ? 'Apply' : `Apply ${i} ${i === 1 ? 'edit' : 'edits'}`}
              </div>
            </div>
          </div>
        </div>
      </m.div>

      {/* Floating proof chips around the window (wide screens) */}
      <div
        className="absolute top-24 -left-6 hidden animate-float items-center gap-2 rounded-full border border-white/10 bg-surface/90 py-1.5 pr-3.5 pl-2 shadow-2xl backdrop-blur lg:flex xl:-left-16"
      >
        <ShieldCheckIcon size={18} weight="duotone" className="text-success" />
        <span className="text-[12px] text-fg-muted">
          GPS &amp; camera data <span className="text-fg">stripped</span>
        </span>
      </div>
      <div className="absolute top-[48%] -right-6 hidden animate-float items-center gap-2 rounded-full border border-white/10 bg-surface/90 py-1.5 pr-3.5 pl-2 shadow-2xl backdrop-blur [animation-delay:-3s] lg:flex xl:-right-14">
        <CheckCircleIcon size={18} weight="duotone" className="text-safelight" />
        <span className="font-mono text-[12px] text-fg tabular-nums">
          {saved > 0 ? `−${saved}%` : '412 KB'} <span className="text-fg-subtle">{saved > 0 ? 'smaller' : 'original'}</span>
        </span>
      </div>
    </div>
  );
}

export default HeroShowcase;

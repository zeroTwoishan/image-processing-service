import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  ArrowClockwiseIcon,
  ArrowsOutSimpleIcon,
  CircleHalfIcon,
  CropIcon,
  FileImageIcon,
  TextTIcon,
} from '@phosphor-icons/react';
import { cx } from '../../lib/ui';
import { Reveal, SectionHeading } from './Reveal';

// Cursor spotlight: the tile tracks the pointer in CSS variables, and a radial gradient follows it.
function track(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

function Tile({ icon: Icon, title, body, className, children, delay = 0, tint }) {
  return (
    <Reveal
      delay={delay}
      onPointerMove={track}
      className={cx(
        'group card relative flex flex-col overflow-hidden rounded-xl',
        tint && 'bg-[radial-gradient(120%_80%_at_100%_0%,rgb(255_106_61/0.22),transparent_60%)]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--mx) var(--my), rgb(255 140 90 / 0.10), transparent 45%)' }}
      />
      <div className="relative min-h-0 flex-1">{children}</div>
      <div className="relative flex flex-col gap-1.5 p-6 pt-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <Icon size={18} weight="duotone" className="text-safelight" aria-hidden="true" />
          {title}
        </h3>
        <p className="text-[14px] leading-relaxed text-fg-muted">{body}</p>
      </div>
    </Reveal>
  );
}

function CropVisual() {
  return (
    <div aria-hidden="true" className="relative h-64 overflow-hidden sm:h-80">
      <img src="/showcase/peak.webp" alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      <motion.div
        className="absolute rounded-[3px] border border-white shadow-[0_0_0_9999px_rgb(11_10_9/0.6)]"
        initial={{ left: '8%', top: '10%', width: '84%', height: '80%' }}
        whileInView={{ left: ['8%', '26%', '18%'], top: ['10%', '14%', '8%'], width: ['84%', '44%', '58%'], height: ['80%', '70%', '78%'] }}
        viewport={{ once: false, margin: '-20%' }}
        transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, n) => (
            <span key={n} className="border-[0.5px] border-white/25" />
          ))}
        </div>
        {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((p) => (
          <span key={p} className={cx('absolute size-2.5 rounded-[2px] bg-white', p)} />
        ))}
        <span className="absolute -top-7 left-0 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-fg">drag me</span>
      </motion.div>
    </div>
  );
}

function RotateVisual() {
  return (
    <div aria-hidden="true" className="grid h-48 place-items-center">
      <div className="relative grid size-36 place-items-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-white/15" />
        {[0, 90, 180, 270].map((d) => (
          <span
            key={d}
            className="absolute font-mono text-[10px] text-fg-subtle"
            style={{ transform: `rotate(${d}deg) translateY(-82px) rotate(${-d}deg)` }}
          >
            {d}°
          </span>
        ))}
        <motion.img
          src="/showcase/sunrise.webp"
          alt=""
          loading="lazy"
          className="size-20 rounded-md object-cover shadow-xl photo-edge"
          animate={{ rotate: [0, 90, 90, 180, 180, 270, 270, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: [0.65, 0, 0.35, 1], times: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.87] }}
        />
      </div>
    </div>
  );
}

function FilterVisual() {
  const cuts = [
    ['none', 'Original'],
    ['grayscale(1) contrast(1.08)', 'Gray'],
    ['sepia(0.95)', 'Sepia'],
  ];
  return (
    <div aria-hidden="true" className="grid h-48 grid-cols-3 gap-1.5 px-6 pt-6">
      {cuts.map(([filter, label]) => (
        <div key={label} className="relative overflow-hidden rounded-md photo-edge">
          <img src="/showcase/forest.webp" alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-110" style={{ filter }} />
          <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-black/60 px-1.5 font-mono text-[10px] text-fg">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ConvertVisual() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });
  const rows = [
    ['PNG', 1840, 'text-fg-subtle'],
    ['JPEG', 412, 'text-fg-muted'],
    ['WEBP', 118, 'text-fg'],
    ['AVIF', 61, 'text-safelight'],
  ];
  return (
    <div ref={ref} aria-hidden="true" className="flex h-48 flex-col justify-center gap-3 px-6 pt-6">
      {rows.map(([fmt, kb, tone], n) => (
        <div key={fmt} className="grid grid-cols-[44px_1fr_64px] items-center gap-3 font-mono text-[11px]">
          <span className={tone}>{fmt}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              className={cx('h-full rounded-full', fmt === 'AVIF' ? 'bg-safelight-gradient' : 'bg-white/25')}
              initial={{ width: 0 }}
              animate={inView ? { width: `${(kb / 1840) * 100}%` } : {}}
              transition={{ duration: 1.1, delay: 0.15 * n, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className={cx('text-right tabular-nums', tone)}>{kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`}</span>
        </div>
      ))}
    </div>
  );
}

function WatermarkVisual() {
  return (
    <div aria-hidden="true" className="relative mx-6 mt-6 h-44 overflow-hidden rounded-md photo-edge md:mb-6 md:h-60">
      <img src="/showcase/dusk.webp" alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      <motion.span
        className="absolute right-3 bottom-2.5 overflow-hidden font-display text-xl whitespace-nowrap text-white/90 italic"
        initial={{ width: 0 }}
        whileInView={{ width: 'auto' }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
      >
        © ishan · 2026
      </motion.span>
    </div>
  );
}

function ResizeVisual() {
  return (
    <div aria-hidden="true" className="flex h-48 items-end justify-center gap-4 px-6 pb-2">
      {[
        [96, '4032×3024', 'text-fg-subtle'],
        [64, '1920×1440', 'text-fg-muted'],
        [40, '1080×810', 'text-fg'],
      ].map(([h, label, tone], n) => (
        <Reveal key={label} delay={0.1 * n} className="flex flex-col items-center gap-2">
          <div className="rounded-md border border-white/15 bg-[linear-gradient(135deg,rgb(255_179_92/0.25),rgb(242_54_43/0.15))]" style={{ height: h, width: (h * 4) / 3 }} />
          <span className={cx('font-mono text-[10px] tabular-nums', tone)}>{label}</span>
        </Reveal>
      ))}
    </div>
  );
}

/** "Everything a photo needs": a bento grid, one tile per edit the server can do. */
export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24">
      <SectionHeading
        id="features-title"
        eyebrowText="Six tools, one Apply"
        title={
          <>
            Everything a photo needs.{' '}
            <span className="font-display font-normal tracking-[-0.02em] italic">Nothing it doesn’t.</span>
          </>
        }
        lead="Every edit previews instantly in your browser. When it looks right, one Apply runs the whole stack on the server with Sharp, in a fixed order, and hands back a clean file."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <Tile
          icon={CropIcon}
          title="Crop on the photo"
          body="Drag a box right on the picture, or type exact pixels. The crop follows along when you rotate or flip."
          className="md:col-span-4"
        >
          <CropVisual />
        </Tile>
        <Tile icon={ArrowClockwiseIcon} title="Rotate & flip" body="Quarter turns, flip and mirror. Phone photos are set upright first." className="md:col-span-2" delay={0.08}>
          <RotateVisual />
        </Tile>
        <Tile icon={CircleHalfIcon} title="Filters" body="Grayscale or sepia, tuned so skin and skies don’t go muddy." className="md:col-span-2">
          <FilterVisual />
        </Tile>
        <Tile
          icon={FileImageIcon}
          title="Convert & compress"
          body="JPEG, PNG, WebP or AVIF with a quality slider. Same photo, a fraction of the bytes."
          className="md:col-span-2"
          delay={0.08}
          tint
        >
          <ConvertVisual />
        </Tile>
        <Tile icon={ArrowsOutSimpleIcon} title="Resize" body="Type one side to keep the shape. Never upscaled, so it never goes soft." className="md:col-span-2" delay={0.16}>
          <ResizeVisual />
        </Tile>
        <Tile
          icon={TextTIcon}
          title="Watermark"
          body="Sign your work with a line of text, drawn into the pixels so it travels with the file."
          className="md:col-span-6 md:grid md:grid-cols-[1.4fr_1fr] md:items-center md:[&>div:last-child]:p-10"
        >
          <WatermarkVisual />
        </Tile>
      </div>
    </section>
  );
}

export default Features;

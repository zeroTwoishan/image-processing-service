import { motion } from 'motion/react';
import { ClockCountdownIcon, EyeSlashIcon, GaugeIcon, MapPinIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { Reveal, SectionHeading } from './Reveal';

const POINTS = [
  [MapPinIcon, 'Location and camera data removed', 'GPS, camera model and other hidden EXIF fields are dropped on every upload.'],
  [EyeSlashIcon, 'Guests leave no trace', 'In Try it, your photo goes to the server, gets edited, and comes straight back. Nothing is written to disk.'],
  [ClockCountdownIcon, 'Accounts self-clean', 'Saved photos and every version are deleted automatically 12 hours after upload.'],
  [GaugeIcon, 'Rate limited', 'Fair-use limits keep the service fast for everyone and abuse out.'],
];

const EXIF = [
  ['GPSLatitude', '31.3962° N'],
  ['GPSLongitude', '75.5354° E'],
  ['Make', 'Google'],
  ['Model', 'Pixel 9'],
  ['DateTimeOriginal', '2026:10:05 07:11:02'],
  ['SerialNumber', '3C1F7A…'],
];

function ExifCard() {
  return (
    <Reveal className="card relative overflow-hidden rounded-xl font-mono text-[12px]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="text-fg-muted">PXL_20261005_071102.jpg</span>
        <span className="flex items-center gap-1.5 text-success">
          <ShieldCheckIcon size={14} weight="fill" aria-hidden="true" /> clean
        </span>
      </div>
      <ul className="flex flex-col px-5 py-3">
        {EXIF.map(([k, v], i) => (
          <li key={k} className="relative grid grid-cols-[1fr_auto] gap-4 py-2">
            <span className="text-fg-subtle">{k}</span>
            <span className="relative text-fg-muted">
              {v}
              <motion.span
                aria-hidden="true"
                className="absolute top-1/2 left-0 h-px w-full origin-left bg-danger/80"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-15%' }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
              />
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-5 py-3 text-fg-subtle">
        <span>6 fields removed</span>
        <span>
          deletes in <span className="text-safelight">11h 58m</span>
        </span>
      </div>
    </Reveal>
  );
}

/** Privacy, told with a "metadata receipt" whose private fields get struck out as it scrolls in. */
export function Privacy() {
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="grid scroll-mt-24 items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="privacy-title"
          align="left"
          eyebrowText="Privacy by default"
          title={
            <>
              Your photos stay <span className="font-display font-normal tracking-[-0.02em] italic">yours.</span>
            </>
          }
          lead="A photo says more than you think. Darkroom strips what you didn’t mean to share and forgets the rest."
        />
        <ul className="grid gap-6 sm:grid-cols-2">
          {POINTS.map(([Icon, title, body], i) => (
            <Reveal as="li" key={title} delay={0.08 * i} className="flex flex-col gap-2">
              <Icon size={20} weight="duotone" className="text-safelight" aria-hidden="true" />
              <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
              <p className="text-[13px] leading-relaxed text-fg-muted">{body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
      <ExifCard />
    </section>
  );
}

export default Privacy;

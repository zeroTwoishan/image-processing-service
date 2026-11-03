import { m } from 'motion/react';
import { DownloadSimpleIcon, SlidersHorizontalIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Reveal, SectionHeading } from './Reveal';

const STEPS = [
  {
    n: '01',
    icon: UploadSimpleIcon,
    title: 'Drop',
    body: 'Drag a photo onto the page or pick one from your phone. JPEG, PNG, WebP, GIF or AVIF, up to 10 MB.',
  },
  {
    n: '02',
    icon: SlidersHorizontalIcon,
    title: 'Tweak',
    body: 'Rotate, crop, resize, filter, sign and convert. Everything previews live. Nothing is sent yet.',
  },
  {
    n: '03',
    icon: DownloadSimpleIcon,
    title: 'Develop',
    body: 'Press Apply once. The server runs every edit in order and you download the finished file.',
  },
];

/** Three numbered steps joined by a line that draws itself as the section scrolls in. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title">
      <SectionHeading
        id="how-title"
        eyebrowText="How it works"
        title={
          <>
            From camera roll to <span className="font-display font-normal tracking-[-0.02em] italic">finished print</span> in three steps.
          </>
        }
      />
      <div className="relative mt-16">
        {/* The connecting line (desktop) */}
        <m.div
          aria-hidden="true"
          className="absolute top-7 right-[16%] left-[16%] hidden h-px origin-left bg-gradient-to-r from-safelight/0 via-safelight/70 to-safelight/0 md:block"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={0.15 * i} className="relative flex flex-col items-center gap-4 text-center">
              <span className="relative grid size-14 place-items-center rounded-full border border-white/10 bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_6px_var(--color-canvas)]">
                <s.icon size={22} weight="duotone" className="text-safelight" aria-hidden="true" />
                <span className="absolute -top-1 -right-1 rounded-full bg-raised px-1.5 font-mono text-[10px] leading-4 text-fg-muted ring-1 ring-white/10">
                  {s.n}
                </span>
              </span>
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-fg">{s.title}</h3>
              <p className="max-w-[32ch] text-[14px] leading-relaxed text-fg-muted">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;

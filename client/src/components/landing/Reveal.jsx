import { motion } from 'motion/react';

/**
 * Fades its children up (with a little blur) the first time they scroll into view. Motion's whileInView
 * uses an IntersectionObserver, so nothing runs while off screen. MotionConfig in main.jsx turns this into
 * an instant change for people who prefer reduced motion.
 */
export function Reveal({ as = 'div', delay = 0, y = 18, className, children, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A section heading block: mono eyebrow, big title, lead paragraph. */
export function SectionHeading({ eyebrowText, title, lead, align = 'center', id }) {
  return (
    <Reveal className={align === 'center' ? 'mx-auto flex max-w-2xl flex-col items-center gap-4 text-center' : 'flex max-w-xl flex-col gap-4'}>
      <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-safelight uppercase">
        <span aria-hidden="true" className="h-px w-5 bg-safelight/60" />
        {eyebrowText}
      </span>
      <h2 id={id} className="text-fg-gradient text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[48px]">
        {title}
      </h2>
      {lead && <p className="max-w-[56ch] text-[15px] leading-relaxed text-fg-muted text-pretty sm:text-base">{lead}</p>}
    </Reveal>
  );
}

export default Reveal;

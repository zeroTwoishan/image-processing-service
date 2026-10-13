import { cx } from '../lib/ui';

/** "Darkroom" in Instrument Serif with tight tracking. Text only, no mark. */
export function Wordmark({ className }) {
  return (
    <span className={cx('font-display text-[26px] leading-[1.1] tracking-[-0.03em] text-fg', className)}>Darkroom</span>
  );
}

export default Wordmark;

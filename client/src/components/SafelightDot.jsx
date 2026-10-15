import { cx } from '../lib/ui';

/**
 * The safelight: a small red-amber dot that glows while something develops
 * (uploading, applying a transform). Pair it with text that says what is happening.
 */
export function SafelightDot({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-block size-2 shrink-0 rounded-full bg-safelight safelight-glow animate-develop', className)}
    />
  );
}

export default SafelightDot;

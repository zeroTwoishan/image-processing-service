import { CircleNotchIcon } from '@phosphor-icons/react';
import { cx, ICON } from '../lib/ui';

/** Small spinner for busy buttons. Decorative: always pair it with text. */
export function Spinner({ size = ICON.md, className }) {
  return <CircleNotchIcon size={size} weight="regular" aria-hidden="true" className={cx('animate-spin', className)} />;
}

export default Spinner;

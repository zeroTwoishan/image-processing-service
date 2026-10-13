import { WarningCircleIcon } from '@phosphor-icons/react';
import { ICON } from '../lib/ui';

/** Error under a field. role="alert" so it is announced when it appears. */
export function FieldError({ id, children }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[13px] text-fg">
      <WarningCircleIcon size={ICON.sm} weight="regular" aria-hidden="true" className="mt-px shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  );
}

export default FieldError;

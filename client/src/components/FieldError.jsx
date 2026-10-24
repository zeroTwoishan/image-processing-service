import { WarningCircleIcon } from '@phosphor-icons/react';
import { ICON } from '../lib/ui';

/**
 * Error under a field. role="alert" so it is announced when it appears.
 * announce={false} for checks that run while you type: an alert on every keystroke would interrupt a screen
 * reader mid-word. The message is still linked to the field through aria-describedby.
 */
export function FieldError({ id, announce = true, children }) {
  return (
    <p id={id} role={announce ? 'alert' : undefined} className="flex items-start gap-1.5 text-[13px] text-fg">
      <WarningCircleIcon size={ICON.sm} weight="regular" aria-hidden="true" className="mt-px shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  );
}

export default FieldError;

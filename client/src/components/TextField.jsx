import { useId, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { cx, focusRing, ICON, pressable } from '../lib/ui';
import { FieldError } from './FieldError';

/**
 * Label, input, error and hint, wired with aria-describedby / aria-invalid.
 * type="password" adds a show/hide button. `suffix` (e.g. "px") sits inside the field.
 * `mono` uses Geist Mono for numeric values.
 */
export function TextField({ label, hint, error, type = 'text', suffix, mono = false, className, id: idProp, ...inputProps }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            'h-11 w-full rounded-md border bg-raised px-3 text-base text-fg placeholder:text-fg-subtle sm:text-[15px]',
            'transition-[border-color] duration-150 ease-out disabled:cursor-not-allowed disabled:text-fg-muted',
            error ? 'border-danger' : 'border-control-edge hover:enabled:border-fg-subtle',
            (isPassword || suffix) && 'pr-12',
            mono && 'font-mono tabular-nums',
            focusRing,
            'focus-visible:outline-offset-1',
          )}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            disabled={inputProps.disabled}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            aria-pressed={reveal}
            className={cx(
              'absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-fg-subtle hover:text-fg disabled:cursor-not-allowed',
              pressable,
              focusRing,
              'focus-visible:outline-offset-[-2px]',
            )}
          >
            {reveal ? <EyeSlashIcon size={ICON.md} aria-hidden="true" /> : <EyeIcon size={ICON.md} aria-hidden="true" />}
          </button>
        )}
        {suffix && !isPassword && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center font-mono text-xs text-fg-subtle">
            {suffix}
          </span>
        )}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="text-[13px] text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export default TextField;

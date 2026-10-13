import { Spinner } from './Spinner';
import { Wordmark } from './Wordmark';

/** Shown briefly while the app checks whether the session is still valid. */
export function FullPageSpinner({ label = 'Checking your session' }) {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="flex flex-col items-start gap-4">
        <Wordmark className="text-[34px]" />
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner className="text-fg-subtle" />
          {label}
        </p>
      </div>
    </div>
  );
}

export default FullPageSpinner;

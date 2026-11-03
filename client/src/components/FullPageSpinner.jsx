import { ApertureMark } from './Wordmark';

/** Shown briefly while the app checks whether the session is still valid: the aperture turning, softly lit. */
export function FullPageSpinner({ label = 'Checking your session' }) {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="relative flex flex-col items-center gap-5">
        <div aria-hidden="true" className="absolute -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(255_106_61/0.25),transparent)]" />
        <ApertureMark className="relative size-14" spinning />
        <p className="relative font-mono text-[12px] tracking-wider text-fg-muted">{label}…</p>
      </div>
    </div>
  );
}

export default FullPageSpinner;

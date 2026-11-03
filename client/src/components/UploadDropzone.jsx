import { useId, useState } from 'react';
import { UploadSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { cx, ICON } from '../lib/ui';
import { buttonClass } from './Button';
import { formatBytes } from '../lib/format';
import { ACCEPTED_TYPES, validateFile } from '../lib/validation';
import { SafelightDot } from './SafelightDot';

const ERRORS = {
  'too-large': 'That file is over 10 MB',
  unsupported: 'That isn’t a supported image',
};

/**
 * Drag-and-drop or click-to-choose upload zone.
 *
 * status:   'idle' | 'dragover' | 'uploading' | 'error'
 *           ('dragover' is also set automatically while a file is over the zone)
 * progress: 0–100 while uploading
 * file:     { name, size } being uploaded, or the one that was rejected
 * error:    'too-large' | 'unsupported' | any message
 * onFile(file)          a file that passed validateFile
 * onReject(code, file)  a file that didn't
 * variant:  'default' (one row, gallery) | 'hero' (big centred card, landing page)
 * inputId:  id for the hidden file input, so other buttons on the page can open the picker
 */
export function UploadDropzone({ status = 'idle', progress = 0, file, error, onFile, onReject, variant = 'default', inputId: inputIdProp }) {
  const uid = useId();
  const inputId = inputIdProp ?? `${uid}-file`;
  const hero = variant === 'hero';
  const [dragging, setDragging] = useState(false);
  const uploading = status === 'uploading';
  // Progress only counts bytes sent. At 100% the server is still checking and re-encoding the photo,
  // so say so instead of showing a frozen "Uploading 100%".
  const verb = progress >= 100 ? 'Processing' : 'Uploading';
  const view = status !== 'uploading' && dragging ? 'dragover' : status;
  const message = ERRORS[error] ?? error;

  function take(files) {
    const f = files?.[0];
    if (!f) return;
    const code = validateFile(f);
    if (code) onReject?.(code, f);
    else onFile?.(f);
  }

  return (
    <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-3">
      {uploading ? (
        <div className="card beam-border flex flex-col gap-4 rounded-lg px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <SafelightDot />
            <p id={`${uid}-title`} className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">
              {verb} {file?.name ?? 'photo'}
            </p>
            <p className="shrink-0 font-mono text-[13px] text-fg-muted tabular-nums">{Math.round(progress)}%</p>
          </div>
          <div
            role="progressbar"
            aria-label={`${verb} ${file?.name ?? 'photo'}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="h-1 overflow-hidden rounded-full bg-white/[0.06]"
          >
            <div
              className="h-full origin-left rounded-full bg-safelight-gradient transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          {file && (
            <p className="font-mono text-xs text-fg-subtle tabular-nums">
              {formatBytes((file.size * progress) / 100)} of {formatBytes(file.size)}
            </p>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files); }}
          className={cx(
            'group relative flex cursor-pointer overflow-hidden rounded-lg border transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out',
            'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-safelight',
            hero
              ? 'flex-col items-center gap-5 px-6 py-10 text-center sm:py-12'
              : 'flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-6',
            view === 'dragover' &&
              'scale-[1.01] border-solid border-safelight/70 bg-safelight/[0.06] shadow-[0_0_0_4px_rgb(255_106_61/0.12),0_20px_60px_-20px_rgb(255_106_61/0.5)]',
            view === 'error' && 'border-dashed border-danger/60 bg-surface',
            (view === 'idle' || !view) && 'border-dashed border-white/15 bg-surface/70 hover:border-white/30 hover:bg-surface',
          )}
        >
          {/* A soft safelight glow along the top edge, brighter on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.18),transparent)] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span
            className={cx(
              'relative grid shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] transition-transform duration-300 group-hover:-translate-y-0.5',
              hero ? 'size-16' : 'size-12',
            )}
          >
            <UploadSimpleIcon
              size={hero ? 30 : 24}
              weight="duotone"
              aria-hidden="true"
              className={cx('transition-colors duration-150', view === 'dragover' ? 'text-safelight' : 'text-fg')}
            />
          </span>
          <div className={cx('relative flex min-w-0 flex-1 flex-col gap-1.5', hero && 'items-center')}>
            <p id={`${uid}-title`} className={cx('font-semibold tracking-[-0.01em] text-fg', hero ? 'text-lg' : 'text-[15px]')}>
              {view === 'dragover' ? 'Drop to upload' : hero ? 'Drop a photo here' : 'Drop a photo here, or choose a file'}
            </p>
            <p className="font-mono text-xs text-balance text-fg-subtle">JPEG · PNG · WebP · GIF · AVIF · up to 10 MB</p>
          </div>
          <span aria-hidden="true" className={cx('relative', buttonClass(hero ? 'primary' : 'secondary', 'w-fit shrink-0 group-active:scale-[0.97]', hero ? 'lg' : 'md'))}>
            {hero ? 'Choose a photo' : 'Choose a file'}
          </span>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => { take(e.target.files); e.target.value = ''; }}
            className="sr-only"
          />
        </label>
      )}

      {view === 'error' && message && (
        <div role="alert" className="flex animate-enter items-start gap-2 text-sm">
          <WarningCircleIcon size={ICON.md} aria-hidden="true" className="shrink-0 text-danger" />
          <p className="pt-px text-fg">
            {message}
            {file && (
              <span className="font-mono text-[13px] text-fg-muted tabular-nums"> · {file.name}, {formatBytes(file.size)}</span>
            )}
          </p>
        </div>
      )}

      <p className={cx('text-[13px] text-fg-subtle', hero && 'text-center')}>We remove the hidden location and camera data saved in your photo. Text printed on the picture itself stays.</p>
    </section>
  );
}

export default UploadDropzone;

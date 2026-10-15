import { useId, useState } from 'react';
import { UploadSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { cx, ICON, pressable } from '../lib/ui';
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
 */
export function UploadDropzone({ status = 'idle', progress = 0, file, error, onFile, onReject }) {
  const uid = useId();
  const inputId = `${uid}-file`;
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
        <div className="flex flex-col gap-4 rounded-lg border border-line-strong bg-surface px-5 py-5 sm:px-6">
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
            className="h-0.5 overflow-hidden rounded-full bg-line-strong"
          >
            <div
              className="h-full origin-left bg-safelight transition-transform duration-300 ease-out"
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
            'group flex cursor-pointer flex-col gap-4 rounded-lg border bg-surface px-5 py-5 transition-[border-color,background-color] duration-150 ease-out sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-6',
            'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-safelight',
            view === 'dragover' && 'border-solid border-fg-muted bg-raised',
            view === 'error' && 'border-dashed border-danger/60',
            (view === 'idle' || !view) && 'border-dashed border-control-edge hover:border-fg-subtle',
          )}
        >
          <UploadSimpleIcon
            size={ICON.xl}
            weight="duotone"
            aria-hidden="true"
            className={cx('shrink-0 transition-colors duration-150', view === 'dragover' ? 'text-fg' : 'text-fg-subtle')}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p id={`${uid}-title`} className="text-[15px] font-medium text-fg">
              {view === 'dragover' ? 'Drop to upload' : 'Drop a photo here, or choose a file'}
            </p>
            <p className="font-mono text-xs text-fg-subtle">JPEG, PNG, WebP, GIF or AVIF · up to 10 MB</p>
          </div>
          <span
            aria-hidden="true"
            className={cx(
              'inline-flex min-h-11 w-fit shrink-0 items-center rounded-md border border-line-strong px-4 text-sm font-medium text-fg group-hover:border-control-edge group-hover:bg-raised group-active:scale-[0.97]',
              pressable,
            )}
          >
            Choose a file
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

      <p className="text-[13px] text-fg-subtle">We remove the hidden location and camera data saved in your photo. Text printed on the picture itself stays.</p>
    </section>
  );
}

export default UploadDropzone;

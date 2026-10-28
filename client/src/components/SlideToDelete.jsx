import { useId, useRef, useState } from 'react';
import { TrashIcon } from '@phosphor-icons/react';
import { cx, ICON } from '../lib/ui';
import { Spinner } from './Spinner';

const HANDLE = 44; // px

/**
 * Slide-to-confirm delete. Drag the handle to the end (or focus it and press
 * the right arrow / End) to call onConfirm. Letting go early springs it back.
 * Clicking the track does nothing, so a stray tap can't delete a photo.
 *
 * label:  what is being deleted, e.g. "IMG_0420.jpg"
 * status: 'idle' | 'deleting'
 */
export function SlideToDelete({ label, onConfirm, status = 'idle', disabled = false }) {
  const id = useId();
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const via = useRef('pointer');
  const deleting = status === 'deleting';
  const shown = deleting ? 100 : pos;

  const finish = () => {
    setDragging(false);
    if (pos >= 100) onConfirm?.();
    else setPos(0);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cx(
          'relative h-12 overflow-hidden rounded-md border bg-surface [container-type:inline-size]',
          deleting ? 'border-danger/40' : 'border-line-strong',
          'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-safelight',
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center pr-4 pl-15 text-sm text-fg-muted"
        >
          {deleting ? `Deleting ${label}` : 'Slide to delete'}
        </span>

        {/* Runner: as wide as the handle's travel; moves with transform only */}
        <div
          aria-hidden="true"
          className={cx('pointer-events-none absolute inset-y-0 left-0 ease-out', !dragging && 'transition-transform duration-[240ms]')}
          style={{ width: `calc(100cqw - ${HANDLE}px)`, transform: `translateX(${shown}%)` }}
        >
          {/* trail behind the handle, clipped by the track */}
          <div className="absolute inset-y-0 bg-danger/[0.08]" style={{ left: `calc(${HANDLE}px - 100cqw)`, width: '100cqw' }} />
          <div
            className={cx(
              'absolute inset-y-1 left-1 grid w-[38px] place-items-center rounded-sm border bg-raised',
              shown >= 100 ? 'border-danger/60 text-danger' : 'border-control-edge text-fg',
            )}
          >
            {deleting ? <Spinner size={ICON.sm} /> : <TrashIcon size={ICON.md} />}
          </div>
        </div>

        <label htmlFor={id} className="sr-only">{`Slide to the end to delete ${label}`}</label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={shown}
          disabled={disabled || deleting}
          aria-valuetext={deleting ? `Deleting ${label}` : pos >= 100 ? 'Release to delete' : `${pos}%`}
          onPointerDown={() => { via.current = 'pointer'; setDragging(true); }}
          onKeyDown={() => { via.current = 'key'; }}
          onChange={(e) => {
            const v = Number(e.target.value);
            // A tap on the track jumps the value; only accept small moves from a drag.
            if (via.current === 'pointer' && Math.abs(v - pos) > 25) return;
            setPos(v);
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
          onKeyUp={() => { if (pos >= 100) onConfirm?.(); }}
          onBlur={() => { if (!deleting && pos < 100) setPos(0); }}
          className="absolute inset-0 size-full cursor-grab opacity-0 active:cursor-grabbing disabled:cursor-not-allowed"
        />
      </div>
      <p aria-live="polite" className="sr-only">{deleting ? `Deleting ${label}` : ''}</p>
    </div>
  );
}

export default SlideToDelete;

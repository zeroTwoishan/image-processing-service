import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CheckIcon,
  CropIcon,
  CaretUpIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
} from '@phosphor-icons/react';
import { cx, focusRing, ICON, pressable } from '../lib/ui';
import {
  changedSteps,
  countChanges,
  cropProblem,
  defaultTransform,
  LOSSLESS,
  croppedArea,
  outputSize,
  reflectCrop,
  resizeProblem,
  rotateCrop,
  rotatedSize,
  stepSummaries,
} from '../lib/transform';
import { useCountdown } from '../hooks/useCountdown';
import { Button } from './Button';
import { Countdown } from './Countdown';
import { FieldError } from './FieldError';
import { Notice } from './Notice';
import { QualitySlider } from './QualitySlider';
import { RateLimitNotice } from './RateLimitNotice';
import { RotateDial } from './RotateDial';
import { SafelightDot } from './SafelightDot';
import { SegmentedControl } from './SegmentedControl';
import { TextField } from './TextField';
import { ToggleButton } from './ToggleButton';
import { TransformStep } from './TransformStep';

const FORMATS = ['jpeg', 'png', 'webp', 'avif'].map((f) => ({ value: f, label: f }));
const plural = (n) => `${n} ${n === 1 ? 'edit' : 'edits'}`;

/**
 * The edit panel: a side panel on desktop, a bottom sheet on phones. (From design-reference, made controlled
 * and wired to the real API: live crop check, exclusive grayscale/sepia, quality off for lossless formats.)
 *
 * value / onChange   the transform (lib/transform.js shape); every change previews instantly, nothing is sent
 * originalFormat     the photo's format: the default output, and what "output changed" compares against
 * onApply(value)
 * status             'idle' | 'applying'
 * rateLimitSeconds   Retry-After from a 429: "Slow down. Try again in 0:30.", Apply locked until 0:00
 * rateLimitKey       change per 429 if the same Retry-After can repeat
 * errors             { crop?: string, general?: string }  crop from the server's INVALID_CROP
 * imageSize          { width, height } of the original, for the crop check and hint
 * isAnimated         shows the GIF note
 * cropping / onCroppingChange   the crop box on the photo is shown ("Crop on photo")
 * applySlot          a DOM element in the page header; on desktop the Apply button is drawn there (and the
 *                    page shows Apply errors under the header). Without it, Apply stays in the panel footer.
 */
export function TransformPanel({
  value: t,
  onChange,
  originalFormat,
  onApply,
  status = 'idle',
  rateLimitSeconds = 0,
  rateLimitKey,
  errors = {},
  imageSize = { width: 0, height: 0 },
  isAnimated = false,
  cropping = false,
  onCroppingChange,
  applySlot,
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  // On a phone the errors live inside the sheet; if it's closed when Apply fails, open it so they're seen.
  useEffect(() => {
    if (errors.general || errors.crop) setOpen(true);
  }, [errors.general, errors.crop]);

  const remaining = useCountdown(rateLimitSeconds, rateLimitKey);
  const applying = status === 'applying';
  const locked = remaining > 0;
  const changed = changedSteps(t, originalFormat);
  const count = countChanges(t, originalFormat);
  const summary = stepSummaries(t);
  // Checked as you type, so a crop or resize that can't work is explained before Apply, not after a round trip.
  const liveCropError = cropProblem(t, imageSize);
  const cropError = liveCropError ?? errors.crop;
  const resizeError = resizeProblem(t);
  const frame = rotatedSize(imageSize, t.rotate);
  const canApply = count > 0 && !applying && !locked && !liveCropError && !resizeError;
  // A GIF original keeps gif unless you pick another format, so gif needs to be a choice you can return to.
  const formats = FORMATS.some((f) => f.value === originalFormat) ? FORMATS : [{ value: originalFormat, label: originalFormat }, ...FORMATS];

  const result = outputSize(t, imageSize);
  const resizeFrom = croppedArea(t, imageSize); // what Resize works on: the crop if there is one
  const hasCrop = changed.crop && !liveCropError;

  const update = (patch) => onChange({ ...t, ...patch });
  // Turning or flipping the photo carries the crop along, so it stays on the same part of the picture.
  const rotate = (deg) => update({ rotate: deg, crop: rotateCrop(t, imageSize, deg) });
  const reflect = (axis, on) => update({ [axis]: on, crop: reflectCrop(t, imageSize, axis) });
  const reset = () => {
    onChange(defaultTransform(originalFormat));
    onCroppingChange?.(false);
  };
  const close = () => {
    setOpen(false);
    toggleRef.current?.focus(); // the focused control is about to slide off-screen
  };
  // Crop mode, like a phone: "Crop on photo" puts the box on the photo, "Done" takes it off and keeps the crop.
  // Outside crop mode the photo isn't draggable, so on a phone a swipe over it scrolls the page.
  const startCropping = () => {
    onCroppingChange?.(true);
    close(); // on a phone the sheet would cover the box you're about to drag
  };
  const removeCrop = () => {
    update({ crop: defaultTransform(originalFormat).crop });
    onCroppingChange?.(false);
  };
  const apply = () => canApply && onApply(t);

  const resizeFieldProps = {
    'aria-invalid': resizeError ? true : undefined,
    'aria-describedby': resizeError ? `${uid}-resize-error` : `${uid}-resize-hint`,
    className: resizeError ? '[&_input]:border-danger' : undefined,
  };

  const resetButton = (extra) => (
    <Button variant="ghost" icon={ArrowCounterClockwiseIcon} onClick={reset} disabled={count === 0 || applying} className={extra}>
      Reset
    </Button>
  );

  const applyButton = (extra) => (
    <Button onClick={apply} disabled={!canApply} className={extra}>
      {applying ? 'Applying…' : count > 0 ? `Apply ${plural(count)}` : 'Apply'}
    </Button>
  );

  const developing = applying && (
    <div className="flex flex-col gap-2" role="status">
      <p className="flex items-center gap-2.5 text-sm text-fg">
        <SafelightDot />
        Applying {plural(count)}
      </p>
      <div aria-hidden="true" className="h-0.5 overflow-hidden rounded-full bg-line-strong">
        <div className="h-full w-1/4 animate-scan bg-safelight" />
      </div>
    </div>
  );

  const generalError = errors.general && <Notice>{errors.general}</Notice>;

  return (
    <>
      {/* Phone: scrim behind the open sheet */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={close}
        className={cx(
          'fixed inset-0 z-30 bg-canvas/70 transition-opacity lg:hidden',
          open ? 'opacity-100 duration-240' : 'pointer-events-none opacity-0 duration-150',
        )}
      />

      <section
        aria-labelledby={`${uid}-title`}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) close();
        }}
        className={cx(
          // phone: bottom sheet, only the bar shows when closed
          'fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-lg border-t border-line-strong bg-surface transition-transform ease-out',
          open ? 'translate-y-0 duration-240' : 'translate-y-[calc(100%-4.5rem)] duration-150',
          // desktop: calm side panel
          'lg:sticky lg:inset-x-auto lg:top-6 lg:bottom-auto lg:z-auto lg:max-h-[calc(100dvh-3rem)] lg:translate-y-0 lg:rounded-lg lg:border',
        )}
      >
        {/* Phone bar: toggle, status, Apply */}
        <div className="flex h-18 shrink-0 items-center gap-2 px-3 lg:hidden">
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={`${uid}-steps`}
            onClick={() => setOpen(!open)}
            className={cx('flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-fg hover:bg-raised', pressable, focusRing)}
          >
            {open ? <CaretDownIcon size={ICON.md} aria-hidden="true" /> : <CaretUpIcon size={ICON.md} aria-hidden="true" />}
            <span id={`${uid}-title`}>Edit</span>
            <span className="font-mono text-xs text-fg-subtle tabular-nums">{count > 0 ? plural(count) : ''}</span>
          </button>
          <div className="min-w-0 flex-1 text-right text-[13px] text-fg-muted">
            {applying && (
              <span className="inline-flex items-center gap-2">
                <SafelightDot />
                Applying
              </span>
            )}
            {!applying && locked && (
              <span>
                Try again in <Countdown seconds={remaining} className="font-mono text-fg tabular-nums" />
              </span>
            )}
            {/* Cropping on a phone happens with the sheet closed, so "Done" has to be reachable from the bar. */}
            {!applying && !locked && cropping && (
              <Button variant="ghost" icon={CheckIcon} onClick={() => onCroppingChange?.(false)} className="px-3">
                Done
              </Button>
            )}
          </div>
          {applyButton('px-3.5')}
        </div>

        {/* Desktop header */}
        <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-5 lg:flex">
          <h2 className="text-[15px] font-semibold text-fg">Edit</h2>
          {resetButton('px-3')}
        </div>

        {/* Closed on a phone, the steps sit below the screen: invisible takes them out of the tab order too, so
            keyboard users can't type into fields they can't see. The visibility switch waits for the slide.
            Scrolling: on a phone sheet, reaching the end must not scroll the page behind it (overscroll-contain);
            on desktop it should carry on into the page, so the wheel never "sticks" at the panel's end.
            relative: a scroll box only clips absolutely positioned children whose containing block is inside it.
            Without it, the visually hidden (sr-only, position: absolute) radio inputs measured from the sticky panel
            instead, escaped the clip, and stretched the page with ~400px of blank space below the content. */}
        <div
          id={`${uid}-steps`}
          className={cx(
            'relative min-h-0 flex-1 overflow-y-auto border-t border-line transition-[visibility] duration-150 max-lg:overscroll-contain lg:border-t-0',
            !open && 'max-lg:invisible',
          )}
        >
          <div className="flex justify-end px-2 pt-2 lg:hidden">{resetButton('px-3')}</div>
          {isAnimated && (
            <div className="px-4 pt-5 sm:px-5">
              <Notice tone="neutral">
                <p>Animated images are flattened to their first frame</p>
              </Notice>
            </div>
          )}

          <fieldset disabled={applying} className="min-w-0">
            <legend className="sr-only">Edits, applied in this order</legend>
            <ol>
              <TransformStep number={1} title="Rotate & flip" summary={summary.rotate} changed={changed.rotate}>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <RotateDial value={t.rotate} onChange={rotate} />
                  <div className="flex flex-col gap-2">
                    <ToggleButton pressed={t.flip} onChange={(on) => reflect('flip', on)} icon={FlipVerticalIcon}>
                      Flip
                    </ToggleButton>
                    <ToggleButton pressed={t.mirror} onChange={(on) => reflect('mirror', on)} icon={FlipHorizontalIcon}>
                      Mirror
                    </ToggleButton>
                  </div>
                </div>
              </TransformStep>

              <TransformStep number={2} title="Crop" summary={summary.crop} changed={changed.crop}>
                <div className="flex flex-wrap items-center gap-2">
                  {cropping ? (
                    <Button variant="secondary" icon={CheckIcon} onClick={() => onCroppingChange?.(false)}>
                      Done
                    </Button>
                  ) : (
                    <Button variant="secondary" icon={CropIcon} onClick={startCropping}>
                      {hasCrop ? 'Adjust crop' : 'Crop on photo'}
                    </Button>
                  )}
                  {changed.crop && (
                    <Button variant="ghost" onClick={removeCrop} className="px-3">
                      Remove crop
                    </Button>
                  )}
                </div>
                <p className="text-[13px] text-fg-subtle">
                  {cropping
                    ? 'Drag the box on the photo: corners and edges resize it, the middle moves it. What’s inside is what you’ll get.'
                    : 'Puts a box on the photo that you drag to choose what to keep.'}
                </p>
                <p className="text-[13px] font-medium text-fg-muted">Or type exact pixels</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['x', 'X'],
                    ['y', 'Y'],
                    ['width', 'Width'],
                    ['height', 'Height'],
                  ].map(([k, label]) => (
                    <TextField
                      key={k}
                      label={label}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      suffix="px"
                      mono
                      value={t.crop[k]}
                      onChange={(e) => update({ crop: { ...t.crop, [k]: e.target.value } })}
                      aria-invalid={cropError ? true : undefined}
                      aria-describedby={cropError ? `${uid}-crop-error` : `${uid}-crop-hint`}
                      className={cropError ? '[&_input]:border-danger' : undefined}
                    />
                  ))}
                </div>
                {cropError ? (
                  // Only the server's answer after Apply is announced; the live check stays quiet while you type.
                  <FieldError id={`${uid}-crop-error`} announce={!liveCropError}>
                    {cropError}
                  </FieldError>
                ) : (
                  // The size the crop is measured against: after rotation, width and height swap.
                  <p id={`${uid}-crop-hint`} className="text-[13px] text-fg-subtle">
                    {t.rotate % 180 ? 'After rotation the photo is ' : 'The photo is '}
                    <span className="font-mono tabular-nums">
                      {frame.width}×{frame.height}
                    </span>
                    . Leave empty to skip.
                  </p>
                )}
              </TransformStep>

              <TransformStep number={3} title="Resize" summary={summary.resize} changed={changed.resize}>
                <p className="text-[13px] text-fg-subtle">
                  Makes the photo fewer pixels, so the file is smaller: handy for a website, email or WhatsApp.{' '}
                  {changed.crop && !liveCropError ? 'Your crop is ' : 'Yours is '}
                  <span className="font-mono text-fg-muted tabular-nums">
                    {resizeFrom.width}×{resizeFrom.height}
                  </span>
                  .
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Width"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    suffix="px"
                    mono
                    value={t.resize.width}
                    onChange={(e) => update({ resize: { ...t.resize, width: e.target.value } })}
                    {...resizeFieldProps}
                  />
                  <TextField
                    label="Height"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    suffix="px"
                    mono
                    value={t.resize.height}
                    onChange={(e) => update({ resize: { ...t.resize, height: e.target.value } })}
                    {...resizeFieldProps}
                  />
                </div>
                {resizeError ? (
                  <FieldError id={`${uid}-resize-error`} announce={false}>
                    {resizeError}
                  </FieldError>
                ) : (
                  <p id={`${uid}-resize-hint`} className="text-[13px] text-fg-subtle">
                    Type one side and it looks the same, just smaller. Type both for an exact size; the extra is trimmed
                    from the middle. Photos are never made bigger.
                  </p>
                )}
                {/* The number people actually care about: what the file will be. */}
                <p className="text-[13px] text-fg-muted" aria-live="polite">
                  Result:{' '}
                  <span className="font-mono text-fg tabular-nums">
                    {result.width}×{result.height} px
                  </span>
                </p>
              </TransformStep>

              <TransformStep number={4} title="Filters" summary={summary.filters} changed={changed.filters}>
                {/* One or the other: both at once would fight over the same pixels (the server says INVALID_TRANSFORM). */}
                <div className="flex flex-wrap gap-2">
                  <ToggleButton pressed={t.filters.grayscale} onChange={(grayscale) => update({ filters: { grayscale, sepia: false } })}>
                    Grayscale
                  </ToggleButton>
                  <ToggleButton pressed={t.filters.sepia} onChange={(sepia) => update({ filters: { grayscale: false, sepia } })}>
                    Sepia
                  </ToggleButton>
                </div>
              </TransformStep>

              <TransformStep number={5} title="Watermark" summary={summary.watermark} changed={changed.watermark}>
                <TextField
                  label="Text"
                  placeholder="© your name"
                  maxLength={60}
                  value={t.watermark}
                  onChange={(e) => update({ watermark: e.target.value })}
                  hint="Leave empty for no watermark."
                />
              </TransformStep>

              <TransformStep number={6} title="Output" summary={summary.output} changed={changed.output}>
                <SegmentedControl legend="Format" options={formats} value={t.format} onChange={(format) => update({ format })} mono />
                {/* Lossless formats have no quality setting at all, so say that instead of showing a dead slider. */}
                {LOSSLESS.includes(t.format) ? (
                  <p className="text-[13px] text-fg-subtle">
                    <span className="font-mono text-fg-muted uppercase">{t.format}</span> keeps every pixel, so there’s no
                    quality to choose. Pick jpeg, webp or avif for a smaller file.
                  </p>
                ) : (
                  <QualitySlider value={t.quality} onChange={(quality) => update({ quality })} />
                )}
              </TransformStep>
            </ol>
          </fieldset>
        </div>

        {/* Desktop footer: status. Apply itself sits in the page header (applySlot), next to Download, where it's
            visible as soon as the page loads; this panel is taller than the screen, so a footer button wasn't. */}
        <div className="hidden shrink-0 flex-col gap-3 border-t border-line p-4 sm:p-5 lg:flex">
          {developing}
          {!applySlot && generalError}
          <RateLimitNotice seconds={rateLimitSeconds} restartKey={rateLimitKey} lead="Slow down." />
          {!applySlot && applyButton('w-full')}
          <p className="text-[13px] text-fg-subtle">Applying makes a new version. The original stays as it is.</p>
        </div>
        {/* A portal draws the button into the header, while this panel still owns its rules (count, disabled, Applying…). */}
        {applySlot && createPortal(applyButton(), applySlot)}

        {/* Phone: status inside the open sheet */}
        {(applying || errors.general || rateLimitSeconds > 0) && (
          <div className={cx('flex shrink-0 flex-col gap-3 border-t border-line p-4 transition-[visibility] duration-150 lg:hidden', !open && 'invisible')}>
            {developing}
            {!applying && generalError}
            {!applying && <RateLimitNotice seconds={rateLimitSeconds} restartKey={rateLimitKey} lead="Slow down." />}
          </div>
        )}
      </section>
    </>
  );
}

export default TransformPanel;

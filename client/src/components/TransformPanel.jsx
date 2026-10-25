import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowsOutSimpleIcon,
  CheckIcon,
  CircleHalfIcon,
  CropIcon,
  FileImageIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  TextTIcon,
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
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button } from './Button';
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
 * The edit panel. (From design-reference, made controlled and wired to the real API: live crop and resize
 * checks, exclusive grayscale/sepia, no quality for lossless formats, a crop box on the photo.)
 *
 * Desktop: a side panel with the six steps numbered in the order the server runs them.
 * Phone: the photo has to stay in view, like a phone's own photo editor, so there is no panel over it. One
 * tool shows at a time, under the photo (drawn into `toolsSlot`), and a bar fixed at the bottom holds the tool
 * tabs and Apply. Each tool's controls are defined once (STEPS below) and used by both layouts.
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
 * applySlot          desktop: a header element the Apply button is drawn into, next to Download
 * toolsSlot          phone: the element under the photo where the chosen tool is drawn
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
  toolsSlot,
}) {
  const uid = useId();
  const wide = useMediaQuery('(min-width: 64rem)'); // Tailwind's lg
  const [tool, setTool] = useState('rotate'); // phone: the tool on screen

  // A crop the server refused is fixed in the Crop tool, so open it on a phone.
  useEffect(() => {
    if (errors.crop) setTool('crop');
  }, [errors.crop]);

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
  // Crop mode, like a phone: "Crop on photo" puts the box on the photo, "Done" takes it off and keeps the crop.
  // Outside crop mode the photo isn't draggable, so on a phone a swipe over it scrolls the page.
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

  const animatedNote = isAnimated && (
    <Notice tone="neutral">
      <p>Animated images are flattened to their first frame</p>
    </Notice>
  );

  // Each tool's controls, defined once. `tab` is the short label on the phone's tab bar.
  const STEPS = [
    {
      key: 'rotate',
      title: 'Rotate & flip',
      tab: 'Rotate',
      icon: ArrowClockwiseIcon,
      content: (
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
      ),
    },
    {
      key: 'crop',
      title: 'Crop',
      tab: 'Crop',
      icon: CropIcon,
      content: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {cropping ? (
              <Button variant="secondary" icon={CheckIcon} onClick={() => onCroppingChange?.(false)}>
                Done
              </Button>
            ) : (
              <Button variant="secondary" icon={CropIcon} onClick={() => onCroppingChange?.(true)}>
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
        </>
      ),
    },
    {
      key: 'resize',
      title: 'Resize',
      tab: 'Size',
      icon: ArrowsOutSimpleIcon,
      content: (
        <>
          <p className="text-[13px] text-fg-subtle">
            Makes the photo fewer pixels, so the file is smaller: handy for a website, email or WhatsApp.{' '}
            {hasCrop ? 'Your crop is ' : 'Yours is '}
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
              Type one side and it looks the same, just smaller. Type both for an exact size; the extra is trimmed from
              the middle. Photos are never made bigger.
            </p>
          )}
          {/* The number people actually care about: what the file will be. */}
          <p className="text-[13px] text-fg-muted" aria-live="polite">
            Result:{' '}
            <span className="font-mono text-fg tabular-nums">
              {result.width}×{result.height} px
            </span>
          </p>
        </>
      ),
    },
    {
      key: 'filters',
      title: 'Filters',
      tab: 'Filters',
      icon: CircleHalfIcon,
      content: (
        // One or the other: both at once would fight over the same pixels (the server says INVALID_TRANSFORM).
        <div className="flex flex-wrap gap-2">
          <ToggleButton pressed={t.filters.grayscale} onChange={(grayscale) => update({ filters: { grayscale, sepia: false } })}>
            Grayscale
          </ToggleButton>
          <ToggleButton pressed={t.filters.sepia} onChange={(sepia) => update({ filters: { grayscale: false, sepia } })}>
            Sepia
          </ToggleButton>
        </div>
      ),
    },
    {
      key: 'watermark',
      title: 'Watermark',
      tab: 'Text',
      icon: TextTIcon,
      content: (
        <TextField
          label="Text"
          placeholder="© your name"
          maxLength={60}
          value={t.watermark}
          onChange={(e) => update({ watermark: e.target.value })}
          hint="Leave empty for no watermark."
        />
      ),
    },
    {
      key: 'output',
      title: 'Output',
      tab: 'Format',
      icon: FileImageIcon,
      content: (
        <>
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
        </>
      ),
    },
  ];

  if (!wide) {
    const current = STEPS.find((s) => s.key === tool);
    const tools = (
      <section aria-label="Edit" className="flex flex-col gap-4">
        {animatedNote}
        <div
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${current.key}`}
          className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-fg">
              {current.title}
              {summary[current.key] && (
                <span className="truncate font-mono text-xs font-normal text-fg-muted tabular-nums">{summary[current.key]}</span>
              )}
            </h2>
            {resetButton('-my-1.5 px-3')}
          </div>
          <fieldset disabled={applying} className="flex min-w-0 flex-col gap-4">
            <legend className="sr-only">{current.title}</legend>
            {current.content}
          </fieldset>
        </div>
        <p className="text-[13px] text-fg-subtle">Applying makes a new version. The original stays as it is.</p>
      </section>
    );

    return (
      <>
        {toolsSlot ? createPortal(tools, toolsSlot) : tools}

        {/* Fixed to the bottom of the screen: status, the tool tabs, Apply. */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)]">
          {(applying || errors.general || rateLimitSeconds > 0) && (
            <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
              {developing}
              {!applying && errors.general && <Notice>{errors.general}</Notice>}
              {!applying && <RateLimitNotice seconds={rateLimitSeconds} restartKey={rateLimitKey} lead="Slow down." />}
            </div>
          )}
          <div role="tablist" aria-label="Edit tools" className="flex overflow-x-auto px-1">
            {STEPS.map((s) => {
              const selected = s.key === tool;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${s.key}`}
                  aria-selected={selected}
                  aria-controls={`${uid}-panel`}
                  onClick={() => setTool(s.key)}
                  className={cx(
                    'relative flex min-h-14 min-w-15 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[11px]',
                    selected ? 'font-medium text-fg' : 'text-fg-subtle',
                    pressable,
                    focusRing,
                  )}
                >
                  <Icon size={ICON.md} weight={selected ? 'fill' : 'regular'} aria-hidden="true" />
                  {s.tab}
                  {/* A dot on tools that will change the photo, the same mark as the desktop steps. */}
                  {changed[s.key] && (
                    <>
                      <span aria-hidden="true" className="absolute top-2 right-[calc(50%-14px)] size-1.5 rounded-full bg-safelight" />
                      <span className="sr-only">, changed</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 px-4 pt-1 pb-3">
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">{count > 0 ? plural(count) : 'No edits yet'}</span>
            {applyButton('px-5')}
          </div>
        </div>
      </>
    );
  }

  return (
    <section aria-labelledby={`${uid}-title`} className="sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col rounded-lg border border-line-strong bg-surface">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-5">
        <h2 id={`${uid}-title`} className="text-[15px] font-semibold text-fg">
          Edit
        </h2>
        {resetButton('px-3')}
      </div>

      {/* Scrolling past the end carries on into the page, so the wheel never "sticks" at the panel's end.
          relative: a scroll box only clips absolutely positioned children whose containing block is inside it.
          Without it, the visually hidden (sr-only, position: absolute) radio inputs measured from the sticky panel
          instead, escaped the clip, and stretched the page with ~400px of blank space below the content. */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {animatedNote && <div className="px-5 pt-5">{animatedNote}</div>}
        <fieldset disabled={applying} className="min-w-0">
          <legend className="sr-only">Edits, applied in this order</legend>
          <ol>
            {STEPS.map((s, i) => (
              <TransformStep key={s.key} number={i + 1} title={s.title} summary={summary[s.key]} changed={changed[s.key]}>
                {s.content}
              </TransformStep>
            ))}
          </ol>
        </fieldset>
      </div>

      {/* Footer: status. Apply itself sits in the page header (applySlot), next to Download, where it's visible as
          soon as the page loads; this panel is taller than the screen, so a footer button wasn't. */}
      <div className="flex shrink-0 flex-col gap-3 border-t border-line p-5">
        {developing}
        {!applySlot && errors.general && <Notice>{errors.general}</Notice>}
        <RateLimitNotice seconds={rateLimitSeconds} restartKey={rateLimitKey} lead="Slow down." />
        {!applySlot && applyButton('w-full')}
        <p className="text-[13px] text-fg-subtle">Applying makes a new version. The original stays as it is.</p>
      </div>
      {/* A portal draws the button into the header, while this panel still owns its rules (count, disabled, Applying…). */}
      {applySlot && createPortal(applyButton(), applySlot)}
    </section>
  );
}

export default TransformPanel;

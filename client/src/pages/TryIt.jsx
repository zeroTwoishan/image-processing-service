import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeftIcon, DownloadSimpleIcon, ImageIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { guestTransform } from '../lib/api.js';
import { cx, focusRing, ICON, textLink } from '../lib/ui';
import { defaultTransform, EXTENSIONS, toApiTransform } from '../lib/transform';
import { formatBytes, formatDimensions } from '../lib/format';
import { nudgeSnoozed, readDismissedAt, rememberDismissed } from '../lib/nudge';
import { Button } from '../components/Button';
import { CompareSlider } from '../components/CompareSlider';
import { EditPreview } from '../components/EditPreview';
import { Notice } from '../components/Notice';
import { SignupNudge } from '../components/SignupNudge';
import { TransformPanel } from '../components/TransformPanel';
import { UploadDropzone } from '../components/UploadDropzone';

const SITE = 'https://darkroom-ishan.vercel.app';

// Opens a blob as an <img> to learn its size. Browsers turn phone photos upright (EXIF) before measuring, like the
// server's autoOrient, so crop numbers mean the same thing on both sides. The object URL is kept for display.
function loadImage(blob) {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Your browser can’t open that image. Try a JPEG or PNG.'));
    };
    img.src = url;
  });
}

/**
 * "Try it": the editor for visitors without an account, at / when logged out.
 * Nothing is stored: the photo stays in the browser, Apply sends it with the edits to /api/guest/transform, and
 * the result comes back as bytes. Both live as object URLs (memory the browser holds until revoked).
 */
export default function TryIt() {
  const [source, setSource] = useState(null); // { file, name, url, width, height, format }
  const [pick, setPick] = useState({ status: 'idle' }); // the dropzone: { status, file?, error? }
  const [transform, setTransform] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState({});
  const [rateLimit, setRateLimit] = useState({ seconds: 0, key: 0 });
  const [result, setResult] = useState(null); // { url, width, height, format, size, edits }
  const [nudge, setNudge] = useState(false);
  const downloaded = useRef(false);
  const [applySlot, setApplySlot] = useState(null);
  const [toolsSlot, setToolsSlot] = useState(null);

  // An Apply can still be running when the visitor leaves; its late answer must not touch a page that's gone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Each object URL keeps its image in memory until revoked. The cleanup runs with the *old* value whenever the
  // photo or result is replaced, and once more when the page closes, so nothing piles up.
  useEffect(() => () => source && URL.revokeObjectURL(source.url), [source]);
  useEffect(() => () => result && URL.revokeObjectURL(result.url), [result]);

  async function open(file) {
    setPick({ status: 'idle' });
    try {
      const image = await loadImage(file);
      if (!mounted.current) return URL.revokeObjectURL(image.url);
      const format = file.type.split('/')[1]; // "image/jpeg" → "jpeg", the panel's format names
      setSource({ file, name: file.name, format, ...image });
      setTransform(defaultTransform(format));
      setResult(null);
      setErrors({});
    } catch (err) {
      setPick({ status: 'error', file, error: err.message });
    }
  }

  async function trySample() {
    try {
      const res = await fetch('/sample.jpg');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      await open(new File([blob], 'sample.jpg', { type: 'image/jpeg' }));
    } catch {
      setPick({ status: 'error', error: 'Couldn’t load the sample photo. Check your connection, then try again.' });
    }
  }

  function startOver() {
    setSource(null);
    setResult(null);
    setCropping(false);
    setNudge(false);
  }

  function changeTransform(next) {
    setTransform(next);
    if (errors.crop || errors.general) setErrors({});
  }

  async function apply(t) {
    setApplying(true);
    setErrors({});
    const edits = toApiTransform(t, source.format);
    try {
      const blob = await guestTransform(source.file, edits);
      const image = await loadImage(blob);
      if (!mounted.current) return URL.revokeObjectURL(image.url);
      setResult({ ...image, format: blob.type.split('/')[1], size: blob.size, edits });
      setCropping(false);
    } catch (err) {
      if (!mounted.current) return;
      if (err.code === 'RATE_LIMITED') setRateLimit({ seconds: err.retryAfter ?? 60, key: Date.now() });
      else if (err.code === 'INVALID_CROP') setErrors({ crop: err.message });
      else setErrors({ general: err.message });
    } finally {
      if (mounted.current) setApplying(false);
    }
  }

  // The result is already in the browser, so no fetch: the object URL is same-origin and <a download> works.
  function download() {
    const name = `${source.name.replace(/\.[^.]*$/, '')}.${EXTENSIONS[result.format]}`; // IMG_0420.jpg → IMG_0420.webp
    const a = Object.assign(document.createElement('a'), { href: result.url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    // Once per visit, after they have what they came for, and not if they said "Not now" this week.
    if (!downloaded.current) {
      downloaded.current = true;
      if (!nudgeSnoozed(readDismissedAt(), Date.now())) setNudge(true);
    }
  }

  const dismissNudge = useCallback(() => {
    rememberDismissed(Date.now());
    setNudge(false);
  }, []);

  const editing = Boolean(source && !result);

  return (
    // pb-40 while editing on phones: room for the edit bar fixed to the bottom of the screen.
    <main className={cx('mx-auto flex w-full max-w-page flex-1 flex-col gap-4 px-4 pt-4 sm:px-6 lg:px-8 lg:pb-16', editing ? 'pb-40' : 'pb-16')}>
      {/* The page people find by searching, so the title says what it does. index.html carries the same title
          and description for crawlers and link previews, which read the raw HTML. */}
      <title>Free online photo editor: crop, rotate, convert · Darkroom</title>
      <link rel="canonical" href={`${SITE}/`} />

      {!source ? (
        <div className="flex flex-col gap-6 pt-4 sm:pt-6">
          <header className="flex flex-col gap-3">
            <h1 className="font-display text-[40px] leading-[1.1] tracking-[-0.03em] text-fg">Edit a photo in your browser</h1>
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-fg-muted">
              Rotate, crop, resize, add a filter or a watermark, and convert to JPEG, PNG, WebP or AVIF. Free, no account needed.
              Nothing is saved: you download the result.
            </p>
          </header>
          <UploadDropzone
            status={pick.status}
            file={pick.file}
            error={pick.error}
            onFile={open}
            onReject={(code, file) => setPick({ status: 'error', file, error: code })}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="secondary" icon={ImageIcon} onClick={trySample}>
              Try with a sample photo
            </Button>
            <p className="text-sm text-fg-muted">
              Want to keep your photos and edits?{' '}
              <Link to="/register" className={textLink}>
                Create a free account
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between gap-x-3 sm:gap-x-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <button
                type="button"
                onClick={startOver}
                className={cx('inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm text-fg-muted transition-colors duration-150 ease-out hover:text-fg', focusRing)}
              >
                <ArrowLeftIcon size={ICON.sm} aria-hidden="true" />
                Another photo
              </button>
              <span aria-hidden="true" className="text-fg-subtle">
                /
              </span>
              <span className="min-w-0 truncate font-mono text-[13px] text-fg">{source.name}</span>
            </div>
            {/* Desktop: the edit panel draws Apply here; phones have it in the panel's bottom bar. */}
            {editing && <div ref={setApplySlot} className="hidden shrink-0 lg:flex" />}
          </header>

          {errors.general && <Notice className="max-lg:hidden">{errors.general}</Notice>}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_var(--container-panel)] lg:items-start lg:gap-10">
            <div className="flex min-w-0 flex-col gap-3 lg:gap-8">
              {result ? (
                <CompareSlider
                  beforeSrc={source.url}
                  beforeWidth={source.width}
                  beforeHeight={source.height}
                  // A wipe only makes sense when the pixels still line up (see CompareSlider).
                  wipe={!['rotate', 'flip', 'mirror', 'crop'].some((step) => result.edits[step])}
                  afterSrc={result.url}
                  alt={source.name}
                  width={result.width}
                  height={result.height}
                />
              ) : (
                <>
                  <div className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-4 max-lg:bg-canvas max-lg:px-4 max-lg:pt-2 max-lg:pb-1 sm:max-lg:-mx-6 sm:max-lg:px-6">
                    <EditPreview
                      src={source.url}
                      alt={source.name}
                      width={source.width}
                      height={source.height}
                      t={transform}
                      cropping={cropping}
                      onCropChange={(box) =>
                        changeTransform({ ...transform, crop: { x: String(box.x), y: String(box.y), width: String(box.width), height: String(box.height) } })
                      }
                    />
                  </div>
                  <div ref={setToolsSlot} className="lg:hidden" />
                </>
              )}
            </div>

            {result ? (
              <Result
                result={result}
                onDownload={download}
                onKeepEditing={() => {
                  setResult(null);
                  setNudge(false); // the card never sits over the editor
                }}
              />
            ) : (
              <TransformPanel
                value={transform}
                onChange={changeTransform}
                originalFormat={source.format}
                onApply={apply}
                status={applying ? 'applying' : 'idle'}
                rateLimitSeconds={rateLimit.seconds}
                rateLimitKey={rateLimit.key}
                errors={errors}
                imageSize={{ width: source.width, height: source.height }}
                // The browser can't cheaply tell an animated GIF from a still one; most GIFs people try are animated.
                isAnimated={source.format === 'gif'}
                cropping={cropping}
                onCroppingChange={setCropping}
                applySlot={applySlot}
                toolsSlot={toolsSlot}
                applyNote="Your photo is edited on our server and sent straight back. Nothing is saved."
              />
            )}
          </div>
        </>
      )}

      <SignupNudge open={nudge} onDismiss={dismissNudge} />
    </main>
  );
}

// The panel's place once a result is back. Focus moves to its heading, so keyboard and screen-reader users
// land on the outcome of Apply instead of a button that just disappeared.
function Result({ result, onDownload, onKeepEditing }) {
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section aria-labelledby="result-heading" className="flex flex-col gap-4">
      <h2 id="result-heading" ref={heading} tabIndex={-1} className="rounded-sm text-sm font-medium text-fg focus:outline-none">
        Your result
      </h2>
      <p className="font-mono text-[13px] text-fg-muted tabular-nums">
        {formatDimensions(result.width, result.height)} · {result.format} · {formatBytes(result.size)}
      </p>
      <Notice tone="neutral">
        <p>Not saved. Download your result before you leave.</p>
      </Notice>
      <div className="flex flex-wrap gap-2">
        <Button icon={DownloadSimpleIcon} onClick={onDownload}>
          Download
        </Button>
        <Button variant="secondary" icon={PencilSimpleIcon} onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </section>
  );
}

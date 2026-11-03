import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { m } from 'motion/react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  ImageIcon,
  PencilSimpleIcon,
} from '@phosphor-icons/react';
import { guestTransform } from '../lib/api.js';
import { cx, focusRing, ICON, pageX, textLink } from '../lib/ui';
import { defaultTransform, EXTENSIONS, toApiTransform } from '../lib/transform';
import { formatBytes, formatDimensions } from '../lib/format';
import { nudgeSnoozed, readDismissedAt, rememberDismissed } from '../lib/nudge';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { SignupNudge } from '../components/SignupNudge';
import { UploadDropzone } from '../components/UploadDropzone';
import { Footer } from '../components/Footer';
import { WhenVisible } from '../components/landing/WhenVisible';

const SITE = 'https://darkroom-ishan.vercel.app';
const HERO_INPUT = 'hero-photo-input'; // the hero dropzone's file input; the CTA band opens it too

// The editor is only needed once a photo is chosen, so it's a separate file: the landing page loads faster.
// `prefetchEditor` starts that download as soon as someone shows intent (pointer over, finger on, or keyboard
// focus in the upload area), so it's usually ready by the time they've picked a photo. Downloading it on page
// load instead would compete with the first paint.
let editorRequested = false;
const prefetchEditor = () => {
  if (editorRequested) return;
  editorRequested = true;
  Promise.all([import('../components/TransformPanel'), import('../components/EditPreview'), import('../components/CompareSlider')]).catch(
    () => (editorRequested = false), // offline? try again on the next hover
  );
};
const TransformPanel = lazy(() => import('../components/TransformPanel'));
const EditPreview = lazy(() => import('../components/EditPreview'));
const CompareSlider = lazy(() => import('../components/CompareSlider'));

// Everything below the hero is its own file too, fetched and built only as the visitor scrolls near it (WhenVisible).
const HeroShowcase = lazy(() => import('../components/landing/HeroShowcase'));
const FilmStrip = lazy(() => import('../components/landing/FilmStrip'));
const Features = lazy(() => import('../components/landing/Features'));
const HowItWorks = lazy(() => import('../components/landing/HowItWorks'));
const Privacy = lazy(() => import('../components/landing/Privacy'));
const CtaBand = lazy(() => import('../components/landing/CtaBand'));

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

  if (!source) {
    return (
      <Landing
        pick={pick}
        onFile={open}
        onReject={(code, file) => setPick({ status: 'error', file, error: code })}
        onSample={trySample}
      />
    );
  }

  return (
    // pb-40 while editing on phones: room for the edit bar fixed to the bottom of the screen.
    <main className={cx(pageX, 'flex flex-1 flex-col gap-4 pt-4 lg:pb-16', editing ? 'pb-40' : 'pb-16')}>
      <title>Free online photo editor: crop, rotate, convert · Darkroom</title>
      <link rel="canonical" href={`${SITE}/`} />

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
          <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] tracking-wider text-fg-subtle uppercase sm:inline">
            Guest · not saved
          </span>
        </div>
        {/* Desktop: the edit panel draws Apply here; phones have it in the panel's bottom bar. */}
        {editing && <div ref={setApplySlot} className="hidden shrink-0 lg:flex" />}
      </header>

      {errors.general && <Notice className="max-lg:hidden">{errors.general}</Notice>}

      <Suspense fallback={<div aria-busy="true" aria-label="Opening the editor" className="shimmer h-[min(68dvh,720px)] min-h-72 rounded-lg" />}>
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
            original={source}
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
      </Suspense>

      <SignupNudge open={nudge} onDismiss={dismissNudge} />
    </main>
  );
}

// The hero's entrance is plain CSS (the `rise` keyframes in index.css), not Motion: it runs on the compositor from
// the very first frame, before any JavaScript animation code has loaded. Each piece gets its own delay (a stagger).
const delay = (ms) => ({ animationDelay: `${ms}ms` });
const HEADLINE = ['Edit', 'photos'];

/**
 * The logged-out home page: hero with the upload zone above the fold, a live product shot, then the
 * features, how it works, privacy and a final call to action.
 */
function Landing({ pick, onFile, onReject, onSample }) {
  const { hash } = useLocation();
  const eager = Boolean(hash); // opened at /#features: build every section now so the jump lands in the right place


  // Links like /#features from other pages: scroll there once the sections exist.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <>
      {/* The page people find by searching, so the title says what it does. index.html carries the same title
          and description for crawlers and link previews, which read the raw HTML. */}
      <title>Free online photo editor: crop, rotate, convert · Darkroom</title>
      <link rel="canonical" href={`${SITE}/`} />

      <main className="relative flex flex-1 flex-col overflow-x-clip">
        {/* Hero backdrop: a safelight spotlight from above, a faded dot grid, and a hairline horizon */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[900px] overflow-hidden mask-fade-b">
          <div className="absolute top-[-380px] left-1/2 h-[760px] w-[1100px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.28),rgb(242_54_43/0.08)_55%,transparent)]" />
          <div className="absolute inset-0 bg-dots [mask-image:radial-gradient(70%_60%_at_50%_0%,#000_30%,transparent)]" />
        </div>

        <section aria-labelledby="hero-title" className={cx(pageX, 'flex flex-col items-center pt-10 text-center sm:pt-20')}>
          <a
            href="#how"
            style={delay(0)}
            className={cx(
              'animate-rise',
              // The light runs round the badge twice, then stops: an endless repaint isn't worth it here.
              'group beam-border inline-flex items-center gap-2 [&::before]:[animation-iteration-count:2] rounded-full border border-white/10 bg-white/[0.03] py-1 pr-3 pl-1 text-[12px] text-fg-muted transition-colors hover:text-fg',
              focusRing,
            )}
          >
            <span className="rounded-full bg-safelight/15 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-safelight uppercase">Free</span>
            No account. Nothing stored.
            <ArrowRightIcon size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1
            id="hero-title"
            className="mt-7 max-w-4xl text-[46px] leading-[0.98] font-semibold tracking-[-0.055em] text-balance text-fg sm:text-[72px] lg:text-[88px]"
          >
            {/* The {' '} between words matters: each word is its own inline-block, and without real spaces the
                heading's text (what screen readers and Google read) would be "Editphotosin your browser." */}
            {HEADLINE.map((w, i) => (
              <span key={w}>
                <span style={delay(80 + i * 90)} className="animate-rise text-fg-gradient inline-block pb-[0.06em]">
                  {w}
                </span>{' '}
              </span>
            ))}
            <br />
            <span style={delay(260)} className="animate-rise text-safelight-gradient inline-block pr-[0.08em] pb-[0.1em] font-display font-normal tracking-[-0.03em] italic">
              in your browser.
            </span>
          </h1>

          <p
            className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-fg-muted text-pretty sm:text-[18px]"
          >
            Rotate, crop, resize, add a filter or a watermark, and convert to JPEG, PNG, WebP or AVIF. Preview everything live,
            press Apply once, download the result.
          </p>

          <div
            id="upload"
            onPointerEnter={prefetchEditor}
            onTouchStart={prefetchEditor}
            onFocus={prefetchEditor}
            style={delay(420)}
            className="animate-rise mt-10 flex w-full max-w-2xl flex-col gap-4 text-left"
          >
            <UploadDropzone variant="hero" inputId={HERO_INPUT} status={pick.status} file={pick.file} error={pick.error} onFile={onFile} onReject={onReject} />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <Button variant="secondary" icon={ImageIcon} onClick={onSample}>
                Try a sample photo
              </Button>
              <p className="text-sm text-fg-muted">
                Want to keep your edits?{' '}
                <Link to="/register" className={textLink}>
                  Create a free account
                </Link>
              </p>
            </div>
          </div>
        </section>

          <WhenVisible eager={eager} margin="0px" reserve="min-h-[313px] sm:min-h-[486px]" className={cx(pageX, 'mt-20 sm:mt-28')}>
            <HeroShowcase />
          </WhenVisible>

          <WhenVisible eager={eager} reserve="min-h-[232px] sm:min-h-[264px]" className="mt-24 overflow-hidden sm:mt-32">
            <FilmStrip />
          </WhenVisible>

          <div className={cx(pageX, 'flex flex-col gap-28 py-24 sm:gap-40 sm:py-32')}>
            <WhenVisible id="features" eager={eager} reserve="min-h-[2320px] md:min-h-[1404px] lg:min-h-[1336px]" className="scroll-mt-24">
              <Features />
            </WhenVisible>
            <WhenVisible id="how" eager={eager} reserve="min-h-[791px] md:min-h-[383px]" className="scroll-mt-24">
              <HowItWorks />
            </WhenVisible>
            <WhenVisible id="privacy" eager={eager} reserve="min-h-[1012px] md:min-h-[781px] lg:min-h-[439px]" className="scroll-mt-24">
              <Privacy />
            </WhenVisible>
            <WhenVisible eager={eager} reserve="min-h-[519px] sm:min-h-[533px]">
              <CtaBand inputId={HERO_INPUT} />
            </WhenVisible>
          </div>
      </main>
      <Footer />
    </>
  );
}

// The panel's place once a result is back. Focus moves to its heading, so keyboard and screen-reader users
// land on the outcome of Apply instead of a button that just disappeared.
function Result({ result, original, onDownload, onKeepEditing }) {
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  const saved = original.file.size ? Math.round((1 - result.size / original.file.size) * 100) : 0;

  return (
    <m.section
      aria-labelledby="result-heading"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="card flex flex-col gap-5 rounded-lg p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-success/10 text-success ring-1 ring-success/25">
          <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h2 id="result-heading" ref={heading} tabIndex={-1} className="rounded-sm text-[15px] font-semibold text-fg focus:outline-none">
            Your photo is developed
          </h2>
          <p className="font-mono text-[12px] text-fg-muted tabular-nums">
            {formatDimensions(result.width, result.height)} · {result.format} · {formatBytes(result.size)}
          </p>
        </div>
      </div>
      {saved > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between font-mono text-[12px] tabular-nums">
            <span className="text-fg-subtle">{formatBytes(original.file.size)} → {formatBytes(result.size)}</span>
            <span className="text-safelight">−{saved}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <m.div
              className="h-full rounded-full bg-safelight-gradient"
              initial={{ width: '100%' }}
              animate={{ width: `${100 - saved}%` }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}
      <Notice tone="neutral">
        <p>Not saved. Download your result before you leave.</p>
      </Notice>
      <div className="flex flex-wrap gap-2">
        <Button icon={DownloadSimpleIcon} onClick={onDownload} className="flex-1">
          Download
        </Button>
        <Button variant="secondary" icon={PencilSimpleIcon} onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </m.section>
  );
}

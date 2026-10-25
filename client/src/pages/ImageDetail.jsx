import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeftIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { cx, focusRing, ICON } from '../lib/ui';
import { countChanges, EXTENSIONS, fromApiTransform, toApiTransform } from '../lib/transform';
import { useNow } from '../hooks/useNow';
import { Button } from '../components/Button';
import { CompareSlider } from '../components/CompareSlider';
import { EditPreview } from '../components/EditPreview';
import { EditableName } from '../components/EditableName';
import { ImageDetails } from '../components/ImageDetails';
import { Notice } from '../components/Notice';
import { TransformPanel } from '../components/TransformPanel';
import { VersionNotice } from '../components/VersionNotice';
import { VersionsStrip } from '../components/VersionsStrip';
import NotFound from './NotFound.jsx';

// The route stays mounted when only :id changes (original → new version), so key the page by id:
// every photo starts with fresh state instead of the last photo's edits and errors.
export default function ImageDetail() {
  const { id } = useParams();
  return <PhotoPage key={id} id={id} />;
}

function PhotoPage({ id }) {
  const navigate = useNavigate();
  // gallerySearch: the gallery page we came from ("?page=2"). prefill: edits to start from ("Edit from original",
  // or Back after Apply). applied: we just arrived from Apply.
  const { gallerySearch = '', prefill, applied } = useLocation().state ?? {};
  const linkState = { gallerySearch };
  const now = useNow(); // re-renders every 30 s so "Expires in" stays current

  // An Apply can still be running when the user leaves (Back, another photo). Its late answer must not
  // navigate them somewhere they didn't ask to go.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [photo, setPhoto] = useState({ status: 'loading' }); // ready: { image, original, versions }
  const [transform, setTransform] = useState(null);
  const [cropping, setCropping] = useState(false); // the crop box is on the photo
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState({}); // { crop?, general? } from the last Apply
  const [rateLimit, setRateLimit] = useState({ seconds: 0, key: 0 });
  const [downloadError, setDownloadError] = useState(null);
  const [applySlot, setApplySlot] = useState(null); // header element the panel draws Apply into (a callback ref)
  const [toolsSlot, setToolsSlot] = useState(null); // phone: under the photo, where the chosen tool is drawn

  useEffect(() => {
    // If we leave before the requests finish, ignore their late answers.
    let ignore = false;
    (async () => {
      try {
        const { image, versions } = await api(`/images/${id}`);
        // A version's page also shows its original and the other versions, which come with the original.
        const family = image.parent ? await api(`/images/${image.parent}`) : { image, versions };
        if (ignore) return;
        const labelled = family.versions.map((v, i) => ({ ...v, label: `v${family.versions.length - i}` })); // newest is highest
        setPhoto({ status: 'ready', image: labelled.find((v) => v.id === image.id) ?? image, original: family.image, versions: labelled });
        setTransform(fromApiTransform(prefill, image.format));
      } catch (err) {
        // Someone else's photo, an expired one, or a made-up id all look the same: "doesn't exist".
        if (!ignore) setPhoto({ status: err.code === 'NOT_FOUND' ? 'not-found' : 'error', message: err.message });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]); // prefill is read once, when the page opens; it isn't a reason to refetch

  if (photo.status === 'not-found') return <NotFound />;

  const { image, original, versions } = photo;
  const isVersion = Boolean(image?.parent);
  const editing = Boolean(!isVersion && transform && countChanges(transform, image.format) > 0);

  function changeTransform(next) {
    setTransform(next);
    if (errors.crop || errors.general) setErrors({}); // the last Apply's error was about the old values
  }

  async function apply(t) {
    setApplying(true);
    setErrors({});
    const transformations = toApiTransform(t, image.format);
    try {
      const { image: version } = await api(`/images/${image.id}/transform`, { method: 'POST', body: { transformations } });
      if (!mounted.current) return;
      // Remember these edits on this page's history entry, so pressing Back to tweak them doesn't start from scratch.
      navigate(`/images/${image.id}`, { replace: true, state: { ...linkState, prefill: transformations } });
      // Show the result: the version's page compares it with the original and has Download.
      navigate(`/images/${version.id}`, { state: { ...linkState, applied: true } });
    } catch (err) {
      if (!mounted.current) return;
      setApplying(false);
      if (err.code === 'RATE_LIMITED') setRateLimit({ seconds: err.retryAfter ?? 60, key: Date.now() });
      else if (err.code === 'INVALID_CROP') setErrors({ crop: err.message });
      else setErrors({ general: err.message }); // a 401 already logged us out in api.js
    }
  }

  // Saved on the server, so the new name survives a refresh and Download uses it. Only this photo's name
  // changes; it's updated everywhere it's shown on the page (the original's name also appears on its versions).
  async function rename(newName) {
    const { image: renamed } = await api(`/images/${image.id}`, { method: 'PATCH', body: { name: newName } });
    const withName = (img) => (img.id === renamed.id ? { ...img, originalName: renamed.originalName } : img);
    setPhoto((p) => ({ ...p, image: withName(p.image), original: withName(p.original), versions: p.versions.map(withName) }));
  }

  // <a download> is ignored for files on another origin (the storage bucket in production), so fetch the bytes and save them
  // through a temporary object URL, which is same-origin.
  async function download() {
    setDownloadError(null);
    try {
      const res = await fetch(image.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const href = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href, download: image.originalName });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000); // free the memory once the save has started
    } catch {
      setDownloadError('Couldn’t download the photo. Check your connection, then try again.');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-4 px-4 pt-4 pb-40 sm:px-6 lg:px-8 lg:pb-16">
      {/* pb-40 on phones: room for the edit bar fixed to the bottom of the screen, so nothing hides under it. */}
      <title>{image ? `${image.originalName} · Darkroom` : 'Photo · Darkroom'}</title>

      {/* One compact row, breadcrumb style, so the photo starts high on the page. */}
      <header className="flex items-center justify-between gap-x-3 sm:gap-x-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {/* Back to the gallery page you came from. Opened from a bookmark or shared link there is no state, so page 1. */}
          <Link
            to={`/${gallerySearch}`}
            className={cx('inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm text-fg-muted transition-colors duration-150 ease-out hover:text-fg', focusRing)}
          >
            <ArrowLeftIcon size={ICON.sm} aria-hidden="true" />
            Your photos
          </Link>
          {image && (
            <>
              <span aria-hidden="true" className="text-fg-subtle">
                /
              </span>
              <EditableName
                key={image.id}
                name={image.originalName}
                onRename={rename}
                // A different output format is picked: show the name the new version will get.
                outputExt={!isVersion && transform && transform.format !== image.format ? EXTENSIONS[transform.format] : undefined}
              />
            </>
          )}
        </div>
        {image && (
          <div className="flex shrink-0 items-center gap-2">
            {/* Icon only on small phones, so the header stays one row and the photo starts higher. */}
            <Button variant="secondary" icon={DownloadSimpleIcon} onClick={download} className="max-sm:px-3">
              <span className="max-sm:sr-only">Download</span>
            </Button>
            {/* Desktop: the edit panel draws its Apply button here, the first thing you see. Phones have it in the
                panel's bottom bar instead, so this slot is hidden there. */}
            {!isVersion && <div ref={setApplySlot} className="hidden lg:flex" />}
          </div>
        )}
      </header>

      {photo.status === 'error' && <Notice>{photo.message}</Notice>}
      {downloadError && <Notice>{downloadError}</Notice>}
      {/* Next to the Apply button that caused it (on phones the panel's sheet shows it instead). */}
      {errors.general && <Notice className="max-lg:hidden">{errors.general}</Notice>}

      {photo.status === 'loading' && (
        // Shaped like the real stage, so nothing jumps when the photo arrives.
        <div aria-busy="true" aria-label="Loading photo" className="h-[min(68dvh,720px)] min-h-72 animate-pulse rounded-lg bg-raised" />
      )}

      {image && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_var(--container-panel)] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-3 lg:gap-8">
            {isVersion ? (
              // Compare the version with the original it was made from (side by side if their shapes differ).
              <CompareSlider
                beforeSrc={original.url}
                beforeWidth={original.width}
                beforeHeight={original.height}
                wipe={!['rotate', 'flip', 'mirror', 'crop'].some((step) => image.transformations?.[step])}
                afterSrc={image.url}
                alt={image.originalName}
                width={image.width}
                height={image.height}
              />
            ) : (
              // An original is the editing stage: edits preview on it, and the crop box is dragged on it.
              // On a phone it sticks to the top of the screen, so the photo stays in view while you use the tools.
              <>
                <div className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-4 max-lg:bg-canvas max-lg:px-4 max-lg:pt-2 max-lg:pb-1 sm:max-lg:-mx-6 sm:max-lg:px-6">
                  <EditPreview
                    src={image.url}
                    alt={image.originalName}
                    width={image.width}
                    height={image.height}
                    t={transform}
                    edited={editing}
                    cropping={cropping}
                    onCropChange={(box) =>
                      changeTransform({ ...transform, crop: { x: String(box.x), y: String(box.y), width: String(box.width), height: String(box.height) } })
                    }
                  />
                </div>
                {/* Phone: the edit panel draws the chosen tool here, right under the photo (empty on desktop). */}
                <div ref={setToolsSlot} className="lg:hidden" />
              </>
            )}

            <VersionsStrip original={original} versions={versions} currentId={image.id} now={now} linkState={linkState} />

            <div className="border-t border-line pt-8">
              <ImageDetails image={image} now={now} madeFrom={isVersion ? original.originalName : undefined} />
            </div>
          </div>

          {isVersion ? (
            <VersionNotice version={image} original={original} now={now} linkState={linkState} focusOnMount={Boolean(applied)} />
          ) : (
            <TransformPanel
              value={transform}
              onChange={changeTransform}
              originalFormat={image.format}
              onApply={apply}
              status={applying ? 'applying' : 'idle'}
              rateLimitSeconds={rateLimit.seconds}
              rateLimitKey={rateLimit.key}
              errors={errors}
              imageSize={{ width: image.width, height: image.height }}
              isAnimated={image.animated}
              cropping={cropping}
              onCroppingChange={setCropping}
              applySlot={applySlot}
              toolsSlot={toolsSlot}
            />
          )}
        </div>
      )}
    </main>
  );
}

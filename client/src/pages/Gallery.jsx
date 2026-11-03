import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowClockwiseIcon, ImagesIcon, SparkleIcon } from '@phosphor-icons/react';
import { api, uploadImage } from '../lib/api.js';
import { useNow } from '../hooks/useNow';
import { useFlashToast } from '../hooks/useFlashToast';
import { cx, ICON, pageX, scrollToTop } from '../lib/ui';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Pagination } from '../components/Pagination';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoGridSkeleton } from '../components/PhotoGridSkeleton';
import { Toast } from '../components/Toast';
import { UploadDropzone } from '../components/UploadDropzone';
import { Footer } from '../components/Footer';

const PAGE_SIZE = 12;

export default function Gallery() {
  const now = useNow();
  // The page lives in the URL (?page=2), not in state: refresh, Back from a photo and shared links all keep it.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1); // "?page=abc" → 1
  const [list, setList] = useState({ images: null, pagination: null, loading: true, failed: false });
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch the same page (after an upload)
  const [upload, setUpload] = useState({ status: 'idle', progress: 0, file: null, error: null });
  const [toast, , closeToast] = useFlashToast(); // "Photo deleted", handed over by the photo's page

  const goTo = (p) => {
    setSearchParams(p > 1 ? { page: String(p) } : {});
    scrollToTop(); // smooth: same page, new photos
  };

  useEffect(() => {
    let ignore = false; // a slow page-1 response must not overwrite page 2 that arrived first
    setList((l) => ({ ...l, loading: true, failed: false })); // keep the old grid on screen while loading
    api(`/images?page=${page}&limit=${PAGE_SIZE}`).then(
      ({ data, pagination }) => {
        if (ignore) return;
        // Past the end (photos expired, or an old link): jump to the last real page instead of showing "no photos".
        if (data.length === 0 && page > pagination.totalPages) {
          setSearchParams(pagination.totalPages > 1 ? { page: String(pagination.totalPages) } : {}, { replace: true });
          return;
        }
        setList({ images: data, pagination, loading: false, failed: false });
      },
      () => !ignore && setList((l) => ({ ...l, loading: false, failed: true })), // a 401 already logged us out in api.js
    );
    return () => {
      ignore = true;
    };
  }, [page, reloadKey, setSearchParams]);

  async function handleFile(file) {
    setUpload({ status: 'uploading', progress: 0, file, error: null });
    try {
      await uploadImage(file, (progress) => setUpload((u) => ({ ...u, progress })));
      setUpload({ status: 'idle', progress: 0, file: null, error: null });
      // Newest first, so the new photo is the first card on page 1.
      if (page === 1) setReloadKey((k) => k + 1);
      else goTo(1);
    } catch (err) {
      // UNSUPPORTED_FILE / FILE_TOO_LARGE / network errors: the server's message is written for people.
      setUpload({ status: 'error', progress: 0, file, error: err.message });
    }
  }

  // The sample goes through the normal upload, so the server needs no special route for it.
  async function trySample() {
    try {
      const res = await fetch('/sample.jpg');
      if (!res.ok) throw new Error();
      await handleFile(new File([await res.blob()], 'sample.jpg', { type: 'image/jpeg' }));
    } catch {
      setUpload({ status: 'error', progress: 0, file: null, error: 'Couldn’t load the sample photo. Check your connection.' });
    }
  }

  // An image that expires while the page is open disappears, the same as the API would hide it.
  const images = list.images?.filter((img) => new Date(img.expiresAt) > now);
  const total = list.pagination?.total ?? 0;

  return (
    <>
    <main className={cx(pageX, 'relative flex flex-1 flex-col gap-8 overflow-x-clip pt-8 pb-20 sm:pt-12')}>
      <title>Your photos · Darkroom</title>
      <div aria-hidden="true" className="pointer-events-none absolute top-[-300px] left-0 -z-10 h-[520px] w-[760px] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.14),transparent)]" />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.18em] text-safelight uppercase">Contact sheet</p>
          <h1 className="text-fg-gradient pb-1 text-[40px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[52px]">
            Your <span className="font-display font-normal tracking-[-0.02em] italic">photos</span>
          </h1>
        </div>
        {total > 0 && (
          <ul className="flex flex-wrap gap-2 font-mono text-[12px] tabular-nums">
            <li className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-fg">
              {total} {total === 1 ? 'photo' : 'photos'}
            </li>
            <li className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-fg-muted">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-safelight safelight-glow" />
              each deleted 12 h after upload
            </li>
          </ul>
        )}
      </header>

      <UploadDropzone
        status={upload.status}
        progress={upload.progress}
        file={upload.file}
        error={upload.error}
        onFile={handleFile}
        // Checked in the browser first (type and 10 MB) for instant feedback; the server checks again.
        onReject={(code, file) => setUpload({ status: 'error', progress: 0, file, error: code })}
      />

      <section aria-label="Your photos" className="flex flex-col gap-8">
        {list.failed ? (
          <Notice
            action={
              <Button variant="secondary" icon={ArrowClockwiseIcon} onClick={() => setReloadKey((k) => k + 1)} className="-my-1.5 shrink-0">
                Try again
              </Button>
            }
          >
            <p>Couldn’t load your photos. Check your connection, then try again.</p>
          </Notice>
        ) : !images ? (
          <>
            <p role="status" className="sr-only">Loading your photos</p>
            <PhotoGridSkeleton />
          </>
        ) : images.length === 0 ? (
          <div className="card flex flex-col items-center gap-5 rounded-xl px-6 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <ImagesIcon size={32} weight="duotone" aria-hidden="true" className="text-safelight" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-semibold text-fg">Your contact sheet is empty</h2>
              <p className="max-w-[40ch] text-[14px] text-fg-muted">
                No photos yet. Upload one above and it will show up here, ready to edit.
              </p>
            </div>
            <Button variant="secondary" icon={SparkleIcon} onClick={trySample} disabled={upload.status === 'uploading'}>
              Try with a sample photo
            </Button>
          </div>
        ) : (
          <>
            <PhotoGrid images={images} now={now} busy={list.loading} />
            <Pagination
              page={page}
              totalPages={list.pagination.totalPages}
              onPrevious={() => goTo(page - 1)}
              onNext={() => goTo(page + 1)}
              disabled={list.loading}
            />
          </>
        )}
      </section>

      <Toast open={Boolean(toast)} message={toast?.message} detail={toast?.detail} onClose={closeToast} />
    </main>
    <Footer />
    </>
  );
}

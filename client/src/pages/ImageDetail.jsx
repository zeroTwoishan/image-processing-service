import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { cx, ICON, textLink } from '../lib/ui';
import { useNow } from '../hooks/useNow';
import { ImageDetails } from '../components/ImageDetails';
import { Notice } from '../components/Notice';
import NotFound from './NotFound.jsx';

// Phase 2a: shows one upload. The transform panel, versions and download arrive in Phase 3.
export default function ImageDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const now = useNow(); // re-renders every 30 s so "Expires in" stays current

  useEffect(() => {
    // If the id changes (or we leave) before the request finishes, ignore its late answer,
    // otherwise an old image could overwrite the new one on screen.
    let ignore = false;
    setState({ status: 'loading' });
    api(`/images/${id}`)
      .then(({ image }) => !ignore && setState({ status: 'ready', image }))
      .catch((err) => !ignore && setState({ status: err.code === 'NOT_FOUND' ? 'not-found' : 'error', message: err.message }));
    return () => {
      ignore = true;
    };
  }, [id]);

  // Someone else's image, a deleted one, or a made-up id all look the same: "doesn't exist".
  if (state.status === 'not-found') return <NotFound />;

  const { image } = state;
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:px-8">
      <title>{image ? `${image.originalName} · Darkroom` : 'Photo · Darkroom'}</title>
      <Link to="/" className={cx(textLink, 'inline-flex min-h-11 w-fit items-center gap-2 text-sm')}>
        <ArrowLeftIcon size={ICON.sm} aria-hidden="true" />
        Your photos
      </Link>

      {state.status === 'error' && <Notice>{state.message}</Notice>}

      {state.status === 'loading' && (
        // Shaped like the real stage, so nothing jumps when the photo arrives.
        <div aria-busy="true" aria-label="Loading photo" className="h-[60vh] animate-pulse rounded-lg bg-raised" />
      )}

      {image && (
        <>
          <h1 className="truncate font-display text-[32px] leading-[1.1] tracking-[-0.03em] text-fg">{image.originalName}</h1>
          <div className="grid place-items-center rounded-lg bg-surface p-4 sm:p-6">
            <img
              src={image.url}
              alt={image.originalName}
              // Real dimensions let the browser reserve the right space before the bytes arrive (no layout jump).
              width={image.width}
              height={image.height}
              className="h-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain photo-edge"
            />
          </div>
          <ImageDetails image={image} now={now} />
        </>
      )}
    </main>
  );
}

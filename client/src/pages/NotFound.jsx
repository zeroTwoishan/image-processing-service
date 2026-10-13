import { Link } from 'react-router';
import { ArrowLeftIcon, ImageBrokenIcon } from '@phosphor-icons/react';
import { cx, ICON, textLink } from '../lib/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col px-4 sm:px-6 lg:px-8">
      <title>Page not found · Darkroom</title>
      <div className="flex max-w-110 flex-col gap-6 pt-12 pb-16 sm:pt-[14vh]">
        <ImageBrokenIcon size={ICON.xl} weight="duotone" aria-hidden="true" className="text-fg-subtle" />
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[44px] leading-[1.1] tracking-[-0.03em] text-fg">This page doesn’t exist</h1>
          <p className="text-[15px] leading-relaxed text-fg-muted">
            If you followed a link to a photo, it may have been deleted. Photos only stay for 12 hours.
          </p>
        </div>
        <Link to="/" className={cx(textLink, 'inline-flex min-h-11 w-fit items-center gap-2 text-sm')}>
          <ArrowLeftIcon size={ICON.sm} aria-hidden="true" />
          Back to your photos
        </Link>
      </div>
    </main>
  );
}

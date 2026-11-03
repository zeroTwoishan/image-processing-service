import { Link } from 'react-router';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { cx, ICON, pageX } from '../lib/ui';
import { buttonClass } from '../components/Button';
import { Footer } from '../components/Footer';

/** 404: an empty, light-struck frame of film. */
export default function NotFound() {
  return (
    <>
      <main className={cx(pageX, 'relative flex flex-1 flex-col items-center overflow-x-clip pt-16 pb-24 text-center sm:pt-24')}>
        <title>Page not found · Darkroom</title>
        <div aria-hidden="true" className="pointer-events-none absolute top-[-280px] left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.2),transparent)]" />

        {/* A blank film frame with sprocket holes, "overexposed" */}
        <div aria-hidden="true" className="relative w-64 -rotate-3 rounded-md bg-[#17120f] px-2 py-1 shadow-2xl sm:w-80">
          <div className="h-4 bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgb(11_10_9)_10px_22px,transparent_22px_32px)]" />
          <div className="relative grid aspect-[3/2] place-items-center overflow-hidden rounded-[3px] bg-[radial-gradient(circle_at_30%_30%,#ffd9b0,#ff6a3d_45%,#5a1a10_100%)]">
            <span className="font-display text-[88px] leading-none text-canvas/80 italic sm:text-[110px]">404</span>
          </div>
          <div className="flex justify-between px-0.5 pt-1 font-mono text-[9px] tracking-wider text-amber/70">
            <span>DARKROOM 400</span>
            <span>▸ 00A</span>
          </div>
          <div className="h-4 bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgb(11_10_9)_10px_22px,transparent_22px_32px)]" />
        </div>

        <h1 className="text-fg-gradient mt-12 pb-1 text-[36px] leading-[1.05] font-semibold tracking-[-0.045em] sm:text-[48px]">
          This frame was <span className="font-display font-normal tracking-[-0.02em] italic">overexposed.</span>
        </h1>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-fg-muted">
          This page doesn’t exist. If you followed a link to a photo, it may have been deleted. Photos only stay for 12 hours.
        </p>
        <Link to="/" className={buttonClass('secondary', 'mt-8')}>
          <ArrowLeftIcon size={ICON.sm} aria-hidden="true" />
          Back to your photos
        </Link>
      </main>
      <Footer />
    </>
  );
}

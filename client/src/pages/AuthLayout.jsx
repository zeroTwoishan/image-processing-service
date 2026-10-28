import { useLocation } from 'react-router';

/**
 * Quiet frame for Login and Register: one narrow, left-aligned column a little above the middle of the screen,
 * plus a before/after sample photo on wide screens. (From design-reference; the Navbar comes from App's Layout.)
 */
export default function AuthLayout({ title, lead, children, footer }) {
  const { pathname } = useLocation();
  return (
    <main className="mx-auto grid w-full max-w-page flex-1 content-start px-4 sm:px-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-16 lg:px-8 xl:gap-24">
      {/* React 19 hoists <title> into <head>; each page gets its own tab/screen-reader title */}
      <title>{`${title} · Darkroom`}</title>
      {/* The one real address of this page (React 19 hoists it into <head>): Vercel also serves every deploy
          at a preview address, and search engines shouldn't count those as duplicates. */}
      <link rel="canonical" href={`https://darkroom-ishan.vercel.app${pathname}`} />
      <div className="flex w-full max-w-form flex-col gap-8 pt-12 pb-16 sm:pt-[14vh]">
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-[44px] leading-[1.1] tracking-[-0.03em] text-fg">{title}</h1>
          {lead && <p className="max-w-[32ch] text-[15px] leading-relaxed text-fg-muted">{lead}</p>}
        </header>
        {children}
        {footer && <p className="text-sm text-fg-muted">{footer}</p>}
      </div>
      <Showcase />
    </main>
  );
}

// Wide screens only: shows at a glance what the app does. One photo, original on the left half, sepia on the right.
// Hidden below lg, and lazy images inside a hidden element are never fetched, so phones don't download it.
function Showcase() {
  const img = 'absolute inset-0 size-full object-cover';
  return (
    <figure className="hidden flex-col gap-3 self-start pt-[14vh] pb-16 lg:flex">
      <div className="relative aspect-3/4 h-[64vh] max-h-180 overflow-hidden rounded-lg bg-surface photo-edge">
        <img
          src="/sample.jpg"
          width="900"
          height="1200"
          loading="lazy"
          decoding="async"
          alt="A sample photo, shown half in its original colours and half in sepia"
          className={img}
        />
        {/* Same file (cached), filtered and clipped to its right half */}
        <img src="/sample.jpg" width="900" height="1200" loading="lazy" decoding="async" alt="" className={`${img} sepia [clip-path:inset(0_0_0_50%)]`} />
        <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fg/70" />
        <span aria-hidden="true" className="absolute bottom-3 left-3 rounded-sm bg-canvas/80 px-2 py-1 font-mono text-xs text-fg">
          Original
        </span>
        <span aria-hidden="true" className="absolute right-3 bottom-3 rounded-sm bg-canvas/80 px-2 py-1 font-mono text-xs text-fg">
          Sepia
        </span>
      </div>
      <figcaption className="font-mono text-xs text-fg-subtle">IMG_0420.jpg · sepia · webp, quality 80</figcaption>
    </figure>
  );
}

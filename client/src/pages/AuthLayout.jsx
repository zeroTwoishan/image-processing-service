import { useLocation } from 'react-router';
import { ClockCountdownIcon, ImagesIcon, StackIcon } from '@phosphor-icons/react';
import { cx, pageX } from '../lib/ui';

const PERKS = [
  [ImagesIcon, 'A private gallery of everything you upload'],
  [StackIcon, 'Every edit kept as a version you can compare'],
  [ClockCountdownIcon, 'Auto-deleted 12 hours later, nothing to clean up'],
];

/**
 * Frame for Login and Register: the form on the left, in a lit card, and a "developing" photo on the right on
 * wide screens. (The Navbar comes from App's Layout.)
 */
export default function AuthLayout({ title, lead, children, footer }) {
  const { pathname } = useLocation();
  return (
    <main className="relative flex flex-1 flex-col overflow-x-clip">
      {/* React 19 hoists <title> into <head>; each page gets its own tab/screen-reader title */}
      <title>{`${title} · Darkroom`}</title>
      {/* The one real address of this page (React 19 hoists it into <head>): Vercel also serves every deploy
          at a preview address, and search engines shouldn't count those as duplicates. */}
      <link rel="canonical" href={`https://darkroom-ishan.vercel.app${pathname}`} />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[760px] overflow-hidden mask-fade-b">
        <div className="absolute top-[-360px] left-[20%] h-[700px] w-[900px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.22),transparent)]" />
        <div className="absolute inset-0 bg-dots [mask-image:radial-gradient(60%_60%_at_25%_0%,#000_20%,transparent)]" />
      </div>

      <div className={cx(pageX, 'grid flex-1 content-start gap-16 pt-10 pb-20 sm:pt-16 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start xl:gap-24')}>
        {/* CSS entrance (animate-rise), starting dim rather than invisible, so the heading counts as painted at once */}
        <div className="flex w-full animate-rise flex-col gap-8 lg:pt-6">
          <header className="flex flex-col gap-3">
            <h1 className="text-fg-gradient pb-1 text-[40px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[48px]">{title}</h1>
            {lead && <p className="max-w-[40ch] text-[15px] leading-relaxed text-fg-muted">{lead}</p>}
          </header>
          <div className="card rounded-xl p-5 sm:p-6">{children}</div>
          {footer && <p className="text-sm text-fg-muted">{footer}</p>}
        </div>
        <Showcase />
      </div>
    </main>
  );
}

// Wide screens only: what an account gets you, around one photo half in colour and half "developed".
// Hidden below lg, and lazy images inside a hidden element are never fetched, so phones don't download it.
function Showcase() {
  const img = 'absolute inset-0 size-full object-cover';
  return (
    <figure style={{ animationDelay: '150ms' }} className="relative hidden animate-rise flex-col gap-4 lg:flex">
      <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[40%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.22),transparent)]" />
      <div className="card relative aspect-[4/3] overflow-hidden rounded-xl p-2">
        <div className="relative size-full overflow-hidden rounded-lg">
          <img src="/showcase/dusk.webp" width="960" height="720" loading="lazy" decoding="async" alt="A dusk mountain photo, shown half in colour and half in sepia" className={img} />
          {/* Same file (cached), filtered and clipped to its right half */}
          <img src="/showcase/dusk.webp" width="960" height="720" loading="lazy" decoding="async" alt="" className={`${img} sepia [clip-path:inset(0_0_0_50%)]`} />
          <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/80" />
          <div aria-hidden="true" className="absolute top-1/2 left-1/2 grid size-9 -translate-1/2 place-items-center rounded-full border border-white/60 bg-black/50 font-mono text-[10px] text-white">
            ⇆
          </div>
          <span aria-hidden="true" className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11px] text-fg">
            Original
          </span>
          <span aria-hidden="true" className="absolute top-3 right-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11px] text-fg">
            v2 · sepia
          </span>
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-3">
        {PERKS.map(([Icon, text]) => (
          <li key={text} className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <Icon size={18} weight="duotone" className="text-safelight" aria-hidden="true" />
            <span className="text-[13px] leading-snug text-fg-muted">{text}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

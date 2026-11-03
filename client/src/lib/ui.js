// Class-name helpers shared by every component. Tokens live in index.css.

export const cx = (...classes) => classes.filter(Boolean).join(' ');

/** 2px safelight outline, 2px offset, keyboard focus only. */
export const focusRing =
  'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight';

/** Hover/press feedback: 150ms, scale 0.97 on press. Never `transition: all`. */
export const pressable =
  'transition-[transform,background-color,border-color,color,opacity,box-shadow,filter] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100';

/** Inline text link: foreground text, quiet underline that brightens on hover. */
export const textLink =
  'rounded-sm font-medium text-fg underline decoration-fg-subtle/50 decoration-1 underline-offset-4 transition-[text-decoration-color] duration-150 ease-out hover:decoration-fg ' +
  focusRing;

/** One icon scale for the whole app. */
export const ICON = {
  sm: 16, // inline with text, captions
  md: 20, // buttons and controls
  xl: 48, // duotone moments: upload zone, empty gallery, 404
};

/** Page gutter + width, shared by every page so edges line up with the navbar. */
export const pageX = 'mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8';

/** Small uppercase label above section headings ("FEATURES"). */
export const eyebrow = 'font-mono text-[11px] font-medium tracking-[0.18em] text-fg-subtle uppercase';

/**
 * Scroll the page back to the top. Smooth by default, but instant for people who ask their system for reduced
 * motion. (`behavior` is always explicit: index.css sets `scroll-behavior: smooth`, which would otherwise apply.)
 */
export function scrollToTop({ smooth = true } = {}) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: smooth && !reduce ? 'smooth' : 'instant' });
}

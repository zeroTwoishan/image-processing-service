// Class-name helpers shared by every component. Tokens live in theme.css.

export const cx = (...classes) => classes.filter(Boolean).join(' ');

/** 2px safelight outline, 2px offset, keyboard focus only. */
export const focusRing =
  'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safelight';

/** Hover/press feedback: 150ms, scale 0.97 on press. Never `transition: all`. */
export const pressable =
  'transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100';

/** Inline text link: foreground text, quiet underline that brightens on hover. */
export const textLink =
  'rounded-sm font-medium text-fg underline decoration-line-strong decoration-1 underline-offset-4 transition-[text-decoration-color] duration-150 ease-out hover:decoration-fg ' +
  focusRing;

/** One icon scale for the whole app. */
export const ICON = {
  sm: 16, // inline with text, captions
  md: 20, // buttons and controls
  xl: 48, // duotone moments: upload zone, empty gallery, 404
};

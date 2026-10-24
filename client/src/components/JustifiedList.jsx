/**
 * Justified rows: every item in a row shares one height and keeps its own
 * aspect ratio. Pure CSS: each <li> grows in proportion to its ratio from a
 * basis of ratio × --row-h; the trailing spacer keeps the last row from
 * stretching. Use justifiedItem(w, h) for each <li> style.
 */
export function JustifiedList({ label, busy, children }) {
  return (
    <ul
      aria-label={label}
      aria-busy={busy || undefined}
      className="flex flex-wrap gap-x-3 gap-y-6 [--row-h:128px] after:block after:grow-[999] after:content-[''] sm:gap-x-4 sm:gap-y-8 sm:[--row-h:170px] lg:[--row-h:200px]"
    >
      {children}
    </ul>
  );
}

export const justifiedItem = (w, h) => ({ flexGrow: w / h, flexBasis: `calc(var(--row-h) * ${w / h})` });

export default JustifiedList;

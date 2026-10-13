/**
 * Quiet frame for Login and Register: one narrow, left-aligned column a little above the middle of the screen.
 * (From design-reference; the Navbar comes from App's Layout instead of being drawn here.)
 */
export default function AuthLayout({ title, lead, children, footer }) {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {/* React 19 hoists <title> into <head>; each page gets its own tab/screen-reader title */}
      <title>{`${title} · Darkroom`}</title>
      <div className="flex w-full max-w-form flex-col gap-8 pt-12 pb-16 sm:pt-[14vh]">
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-[44px] leading-[1.1] tracking-[-0.03em] text-fg">{title}</h1>
          {lead && <p className="max-w-[32ch] text-[15px] leading-relaxed text-fg-muted">{lead}</p>}
        </header>
        {children}
        {footer && <p className="text-sm text-fg-muted">{footer}</p>}
      </div>
    </main>
  );
}

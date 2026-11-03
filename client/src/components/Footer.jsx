import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { GithubLogoIcon, LinkedinLogoIcon } from '@phosphor-icons/react';
import { cx, focusRing, pageX } from '../lib/ui';
import { Wordmark } from './Wordmark';

const link = cx('rounded-sm text-[13px] text-fg-muted transition-colors hover:text-fg', focusRing);

/** Site footer: brand line, a few links, and a giant faded wordmark as the last thing on the page. */
export function Footer() {
  const { user } = useAuth();
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/[0.06]">
      <div className={cx(pageX, 'flex flex-col gap-10 pt-14 pb-10')}>
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div className="flex max-w-xs flex-col gap-3">
            <Wordmark />
            <p className="text-[13px] leading-relaxed text-fg-subtle">
              A tiny photo lab in your browser. Rotate, crop, filter, watermark and convert, then take your picture home.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-14 text-[13px]">
            <ul className="flex flex-col gap-3">
              <li className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle uppercase">Product</li>
              {user ? (
                <li><Link to="/" className={link}>Your photos</Link></li>
              ) : (
                <>
                  <li><a href="/#features" className={link}>Features</a></li>
                  <li><Link to="/register" className={link}>Create account</Link></li>
                  <li><Link to="/login" className={link}>Log in</Link></li>
                </>
              )}
            </ul>
            <ul className="flex flex-col gap-3">
              <li className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle uppercase">Elsewhere</li>
              <li>
                <a href="https://github.com/zeroTwoishan" className={cx(link, 'inline-flex items-center gap-1.5')}>
                  <GithubLogoIcon size={14} aria-hidden="true" /> GitHub
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/ishan-keshari-410266398/" className={cx(link, 'inline-flex items-center gap-1.5')}>
                  <LinkedinLogoIcon size={14} aria-hidden="true" /> LinkedIn
                </a>
              </li>
              <li><a href="https://roadmap.sh/projects/image-processing-service" className={link}>roadmap.sh project</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 font-mono text-[11px] text-fg-subtle">
          <span>© {new Date().getFullYear()} Darkroom · built by Ishan</span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" aria-hidden="true" />
            Photos auto-delete after 12 hours
          </span>
        </div>
      </div>
      {/* The big faded name, cropped by the bottom edge. SVG text, not HTML text: it's decoration, and as HTML the
          contrast checkers (Lighthouse, axe) flag it, even with aria-hidden. */}
      <svg aria-hidden="true" viewBox="0 0 1000 170" className="pointer-events-none block w-full select-none" focusable="false">
        <text x="500" y="200" textAnchor="middle" fill="rgb(255 255 255 / 0.025)" className="font-sans" fontSize="250" fontWeight="600" letterSpacing="-14">
          Dark<tspan className="font-display" fontWeight="400" fontStyle="italic" letterSpacing="-4">room</tspan>
        </text>
      </svg>
    </footer>
  );
}

export default Footer;

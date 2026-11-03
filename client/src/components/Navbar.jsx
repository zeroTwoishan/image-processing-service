import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { cx, focusRing, ICON, pageX, pressable } from '../lib/ui';
import { buttonClass } from './Button';
import { Wordmark } from './Wordmark';

// Section links on the landing page (logged-out "/"). Plain hrefs so they also work from /login.
const SECTIONS = [
  ['Features', '/#features'],
  ['How it works', '/#how'],
  ['Privacy', '/#privacy'],
];

const navLink = cx('inline-flex min-h-9 items-center rounded-md px-3 text-[13px] font-medium', pressable, focusRing);

/**
 * Top bar: sticky and frosted. Transparent at the very top of the page so the hero's glow shows through,
 * then it gains a hairline and blur once you scroll (Linear / Vercel style).
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        // Sticky on desktop only: on phones the editor pins the photo to the top of the screen instead.
        'relative top-0 z-40 border-b transition-[background-color,border-color] duration-300 lg:sticky',
        scrolled ? 'glass border-white/[0.06]' : 'border-transparent bg-transparent',
      )}
    >
      <nav aria-label="Main" className={cx(pageX, 'flex h-16 items-center justify-between gap-4')}>
        <Link to="/" aria-label="Darkroom, home" className={cx('-ml-1 rounded-md px-1 py-1', focusRing)}>
          <Wordmark />
        </Link>

        {!user && (
          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {SECTIONS.map(([label, href]) => (
              <li key={href}>
                <a href={href} className={cx(navLink, 'text-fg-muted hover:bg-white/[0.05] hover:text-fg')}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cx(navLink, 'max-sm:hidden', isActive ? 'bg-white/[0.06] text-fg' : 'text-fg-muted hover:text-fg')
              }
            >
              Photos
            </NavLink>
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pr-3 pl-1">
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-safelight-gradient text-[11px] font-semibold text-safelight-ink uppercase"
              >
                {user.username.slice(0, 1)}
              </span>
              <span className="truncate text-[13px] text-fg-muted">
                <span className="sr-only">Logged in as </span>
                {user.username}
              </span>
            </span>
            <button type="button" onClick={logout} className={cx(navLink, 'gap-2 text-fg-muted hover:bg-white/[0.06] hover:text-fg')}>
              <SignOutIcon size={ICON.md} aria-hidden="true" />
              <span className="max-sm:sr-only">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              to="/login"
              aria-current={pathname === '/login' ? 'page' : undefined}
              className={cx(navLink, pathname === '/login' ? 'text-fg' : 'text-fg-muted hover:text-fg')}
            >
              Log in
            </Link>
            <Link to="/register" aria-current={pathname === '/register' ? 'page' : undefined} className={buttonClass('light', undefined, 'sm')}>
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

import { Link, useLocation } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { cx, focusRing, ICON, pressable } from '../lib/ui';
import { Wordmark } from './Wordmark';

const navLink = cx('inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium', pressable, focusRing);

// Top bar (look from design-reference, wired to AuthContext and React Router).
export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="border-b border-line bg-canvas">
      <nav aria-label="Main" className="mx-auto flex h-14 w-full max-w-page items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to={user ? '/' : '/login'} aria-label="Darkroom, home" className={cx('-ml-1 rounded-sm px-1', focusRing)}>
          <Wordmark />
        </Link>

        {user ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <span className="truncate text-sm text-fg-muted">
              <span className="sr-only">Logged in as </span>
              {user.username}
            </span>
            <button type="button" onClick={logout} className={cx(navLink, 'gap-2 text-fg-muted hover:bg-raised hover:text-fg')}>
              <SignOutIcon size={ICON.md} aria-hidden="true" />
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              to="/login"
              aria-current={pathname === '/login' ? 'page' : undefined}
              className={cx(navLink, pathname === '/login' ? 'text-fg' : 'text-fg-muted hover:text-fg')}
            >
              Log in
            </Link>
            <Link
              to="/register"
              aria-current={pathname === '/register' ? 'page' : undefined}
              className={cx(navLink, 'border border-line-strong text-fg hover:border-control-edge hover:bg-raised')}
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

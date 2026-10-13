import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-zinc-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold">
          Image Processing Service
        </Link>
        {/* While /me is in flight we don't know yet, so show nothing rather than the wrong links. */}
        {!loading &&
          (user ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-zinc-400">{user.username}</span>
              <button onClick={logout} className="rounded-md border border-zinc-700 px-3 py-1 hover:bg-zinc-800">
                Log out
              </button>
            </div>
          ) : (
            <div className="flex gap-4 text-sm">
              <Link to="/login">Log in</Link>
              <Link to="/register">Sign up</Link>
            </div>
          ))}
      </nav>
    </header>
  );
}

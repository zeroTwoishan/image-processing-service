import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

// Wraps routes that need a logged-in user (see App.jsx).
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still asking /me: don't redirect yet, or a logged-in user flashes to /login on every refresh.
  if (loading) return <p className="p-8 text-center text-zinc-400">Loading…</p>;

  // Remember where they were going, so Login can send them back there.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />; // render the matched child route
}

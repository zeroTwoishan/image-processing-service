import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

// Wraps routes that need a logged-in user (see App.jsx).
// App's Layout waits for the session check (/me), so `loading` is already false by the time we render.
export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  // Remember where they were going, so Login can send them back there.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />; // render the matched child route
}

import { Outlet, Route, Routes } from 'react-router';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { FullPageSpinner } from './components/FullPageSpinner';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Gallery from './pages/Gallery.jsx';
import ImageDetail from './pages/ImageDetail.jsx';
import NotFound from './pages/NotFound.jsx';

// Every page gets the navbar; <Outlet /> is where the matched page renders.
function Layout() {
  const { loading } = useAuth();
  // Until /me answers we don't know who you are, so show the session check instead of guessing.
  if (loading) return <FullPageSpinner />;
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Everything inside here needs a logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Gallery />} />
          <Route path="/images/:id" element={<ImageDetail />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

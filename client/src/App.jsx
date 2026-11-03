import { lazy, Suspense, useRef } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ScrollToTop } from './components/ScrollToTop.jsx';
import { FullPageSpinner } from './components/FullPageSpinner';
import TryIt from './pages/TryIt.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Code splitting: each of these pages is its own small file, downloaded the first time it's opened. The public
// pages search engines see (home, login, register) stay in the main bundle so they show without a second request.
const Gallery = lazy(() => import('./pages/Gallery.jsx'));
const ImageDetail = lazy(() => import('./pages/ImageDetail.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// "/" is your gallery when you're logged in, and the "Try it" editor when you're not.
function Home() {
  const { user } = useAuth();
  return user ? <Gallery /> : <TryIt />;
}

// Every page gets the navbar; <Outlet /> is where the matched page renders.
function Layout() {
  const { loading } = useAuth();
  const { pathname } = useLocation();
  // The first page shows at once (fading it in would delay the first paint). Once you've moved to another page,
  // every page fades in. The wrapper is keyed by path, so the fade replays on each new page.
  const firstPath = useRef(pathname);
  const navigated = useRef(false);
  if (pathname !== firstPath.current) navigated.current = true;
  // Until /me answers we don't know who you are, so show the session check instead of guessing.
  if (loading) return <FullPageSpinner />;
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <Navbar />
      {/* Opacity only: a transform here would break the editor's position:fixed bottom bar on phones */}
      <div key={pathname} className={navigated.current ? 'flex flex-1 animate-page flex-col' : 'flex flex-1 flex-col'}>
        {/* While a page's file downloads (a few KB, usually instant), keep the space so the footer doesn't jump up. */}
        <Suspense fallback={<main className="flex-1" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        {/* Everything inside here needs a logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/images/:id" element={<ImageDetail />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

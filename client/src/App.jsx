import { Outlet, Route, Routes } from 'react-router';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Gallery from './pages/Gallery.jsx';
import NotFound from './pages/NotFound.jsx';

// Every page gets the navbar; <Outlet /> is where the matched page renders.
function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main>
        <Outlet />
      </main>
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
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

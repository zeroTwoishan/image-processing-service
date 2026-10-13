import { useAuth } from '../context/AuthContext.jsx';

// Placeholder until Phase 2a/2b (upload + gallery grid).
export default function Gallery() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Hi, {user.username}</h1>
      <p className="mt-2 text-zinc-400">Your gallery arrives in Phase 2.</p>
    </div>
  );
}

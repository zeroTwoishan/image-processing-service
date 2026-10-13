import { useAuth } from '../context/AuthContext.jsx';

// Placeholder until Phase 2a/2b (upload + gallery grid, already designed in design-reference).
export default function Gallery() {
  const { user } = useAuth();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-3 px-4 pt-12 sm:px-6 lg:px-8">
      <title>Your photos · Darkroom</title>
      <h1 className="font-display text-[44px] leading-[1.1] tracking-[-0.03em] text-fg">Hi, {user.username}</h1>
      <p className="text-[15px] text-fg-muted">Uploads arrive in Phase 2.</p>
    </main>
  );
}

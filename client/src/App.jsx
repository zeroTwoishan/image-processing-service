import { useEffect, useState } from 'react';

// Phase 0 placeholder: proves the Vite proxy reaches the API. Pages and routing arrive in Phase 1.
export default function App() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    fetch('/api/health/ready')
      .then((res) => setStatus(res.ok ? 'ready' : 'database unavailable'))
      .catch(() => setStatus('API not reachable'));
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-100">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">Image Processing Service</h1>
        <p className="text-zinc-400">API: {status}</p>
      </div>
    </main>
  );
}

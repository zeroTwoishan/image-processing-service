import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import Field from '../components/Field.jsx';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockedFor, lockFor] = useCountdown();

  // Logged in (already, or just now): go back to where ProtectedRoute sent us from.
  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      await login(form.get('username'), form.get('password'));
    } catch (err) {
      if (err.code === 'RATE_LIMITED') lockFor(err.retryAfter ?? 60);
      else setError(err.message); // UNAUTHORIZED: "Wrong username or password"
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Log in</h1>

      {lockedFor > 0 && (
        <p role="alert" className="rounded-md bg-amber-950 p-3 text-amber-200">
          Too many attempts. Try again in {mmss(lockedFor)}.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-950 p-3 text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {/* disabling the fieldset disables every input and button inside it */}
        <fieldset disabled={submitting || lockedFor > 0} className="space-y-4">
          <Field label="Username" name="username" autoComplete="username" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <button className="w-full rounded-md bg-zinc-100 py-2 font-medium text-zinc-900 disabled:opacity-50">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </fieldset>
      </form>

      <p className="text-sm text-zinc-400">
        No account?{' '}
        <Link to="/register" className="text-zinc-100 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

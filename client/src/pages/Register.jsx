import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import Field from '../components/Field.jsx';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Register() {
  const { user, register } = useAuth();
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockedFor, lockFor] = useCountdown();

  // register() logs you in too, so once user is set we're done here.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setFieldErrors({});

    if (form.get('password') !== form.get('confirm')) {
      setFieldErrors({ confirm: 'Passwords don’t match' });
      return;
    }

    setSubmitting(true);
    try {
      await register(form.get('username'), form.get('password'));
    } catch (err) {
      if (err.code === 'RATE_LIMITED') lockFor(err.retryAfter ?? 60);
      else if (err.code === 'USERNAME_TAKEN') setFieldErrors({ username: err.message });
      else if (err.code === 'VALIDATION_FAILED') {
        // Server sends { fieldErrors: { password: ['...'] } }; show the first message per field.
        const byField = err.details?.fieldErrors ?? {};
        setFieldErrors(Object.fromEntries(Object.entries(byField).map(([field, msgs]) => [field, msgs[0]])));
      } else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Create an account</h1>

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

      {/* The browser checks required/pattern/minLength first; the server checks again (it can't trust us). */}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting || lockedFor > 0} className="space-y-4">
          <Field
            label="Username"
            name="username"
            autoComplete="username"
            required
            pattern="[A-Za-z0-9_]{3,30}"
            hint="3–30 characters: letters, numbers or _"
            error={fieldErrors.username}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            hint="At least 8 characters"
            error={fieldErrors.password}
          />
          <Field
            label="Confirm password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            error={fieldErrors.confirm}
          />
          <button className="w-full rounded-md bg-zinc-100 py-2 font-medium text-zinc-900 disabled:opacity-50">
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </fieldset>
      </form>

      <p className="text-sm text-zinc-400">
        Already have an account?{' '}
        <Link to="/login" className="text-zinc-100 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

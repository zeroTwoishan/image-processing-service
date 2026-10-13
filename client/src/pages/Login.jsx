import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useCountdown } from '../hooks/useCountdown';
import { textLink } from '../lib/ui';
import AuthLayout from './AuthLayout.jsx';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { RateLimitNotice } from '../components/RateLimitNotice';
import { TextField } from '../components/TextField';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [values, setValues] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // key changes on every 429, so the countdown restarts even if Retry-After repeats.
  const [rateLimit, setRateLimit] = useState({ seconds: 0, key: 0 });
  const locked = useCountdown(rateLimit.seconds, rateLimit.key) > 0;

  // Logged in (already, or just now): go back to where ProtectedRoute sent us from.
  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked || submitting) return;
    if (!values.username || !values.password) return setError('Enter your username and password');

    setError(null);
    setSubmitting(true);
    try {
      await login(values.username, values.password);
    } catch (err) {
      if (err.code === 'RATE_LIMITED') setRateLimit({ seconds: err.retryAfter ?? 60, key: Date.now() });
      else setError(err.message); // UNAUTHORIZED: "Wrong username or password"
      setSubmitting(false);
    }
  }

  const showError = error && !locked;
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value });

  return (
    <AuthLayout
      title="Log in"
      lead="Back to your photos. Anything you uploaded in the last 12 hours is still here."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className={textLink}>
            Create an account
          </Link>
        </>
      }
    >
      <form
        noValidate
        aria-label="Log in"
        aria-describedby={showError ? 'login-error' : undefined}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <RateLimitNotice seconds={rateLimit.seconds} restartKey={rateLimit.key} />
        {showError && (
          <Notice>
            <p id="login-error">{error}</p>
          </Notice>
        )}

        <fieldset disabled={submitting || locked} className="flex min-w-0 flex-col gap-4">
          <legend className="sr-only">Your account</legend>
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={values.username}
            onChange={set('username')}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={values.password}
            onChange={set('password')}
          />
        </fieldset>

        <Button type="submit" busy={submitting} busyLabel="Logging in" disabled={locked} className="mt-1 w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}

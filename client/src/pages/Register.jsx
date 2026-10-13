import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useCountdown } from '../hooks/useCountdown';
import { textLink } from '../lib/ui';
import { validateRegister } from '../lib/validation';
import AuthLayout from './AuthLayout.jsx';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { RateLimitNotice } from '../components/RateLimitNotice';
import { TextField } from '../components/TextField';

export default function Register() {
  const { user, register } = useAuth();
  const [values, setValues] = useState({ username: '', password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null); // anything that isn't about one field (e.g. server unreachable)
  const [submitting, setSubmitting] = useState(false);
  const [rateLimit, setRateLimit] = useState({ seconds: 0, key: 0 });
  const locked = useCountdown(rateLimit.seconds, rateLimit.key) > 0;

  // register() logs you in too, so once user is set we're done here.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked || submitting) return;

    // Same rules as the server, checked here first for instant feedback. The server checks again.
    const found = validateRegister(values);
    setFieldErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register(values.username, values.password);
    } catch (err) {
      if (err.code === 'RATE_LIMITED') setRateLimit({ seconds: err.retryAfter ?? 60, key: Date.now() });
      else if (err.code === 'USERNAME_TAKEN') setFieldErrors({ username: err.message });
      else if (err.code === 'VALIDATION_FAILED') {
        // Server sends { fieldErrors: { password: ['...'] } }; show the first message per field.
        const byField = err.details?.fieldErrors ?? {};
        setFieldErrors(Object.fromEntries(Object.entries(byField).map(([field, msgs]) => [field, msgs[0]])));
      } else setError(err.message);
      setSubmitting(false);
    }
  }

  // Typing in a field clears that field's error.
  const field = (key) => ({
    name: key,
    value: values[key],
    error: fieldErrors[key],
    onChange: (e) => {
      setValues({ ...values, [key]: e.target.value });
      if (fieldErrors[key]) setFieldErrors({ ...fieldErrors, [key]: undefined });
    },
  });

  return (
    <AuthLayout
      title="Create an account"
      lead="Upload a photo, edit it, download it. Everything you upload is deleted 12 hours later."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={textLink}>
            Log in
          </Link>
        </>
      }
    >
      <form noValidate aria-label="Create an account" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <RateLimitNotice seconds={rateLimit.seconds} restartKey={rateLimit.key} />
        {error && !locked && <Notice>{error}</Notice>}

        <fieldset disabled={submitting || locked} className="flex min-w-0 flex-col gap-4">
          <legend className="sr-only">Your new account</legend>
          <TextField
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            hint="3–30 characters: letters, numbers or _"
            {...field('username')}
          />
          <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" {...field('password')} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" {...field('confirm')} />
        </fieldset>

        <Button type="submit" busy={submitting} busyLabel="Creating account" disabled={locked} className="mt-1 w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

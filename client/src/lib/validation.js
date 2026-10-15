// Client-side checks that mirror the server's rules. The server stays the source of truth.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Returns 'too-large' | 'unsupported' | null */
export function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'unsupported';
  if (file.size > MAX_UPLOAD_BYTES) return 'too-large';
  return null;
}

const USERNAME = /^[A-Za-z0-9_]{3,30}$/;

/** Returns { username?, password?, confirm? } with a message for each problem. */
export function validateRegister({ username, password, confirm }) {
  const errors = {};
  if (username.length < 3 || username.length > 30) errors.username = 'Username must be 3–30 characters';
  else if (!USERNAME.test(username)) errors.username = 'Use only letters, numbers or _';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (confirm !== password) errors.confirm = 'Passwords don’t match';
  return errors;
}

// The only place the client talks to the API. Every failure becomes an ApiError carrying the server's `code`,
// so the UI branches on err.code, never on message text.

const TOKEN_KEY = 'token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor({ status, code, message, details, retryAfter }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details; // e.g. { fieldErrors: { password: ['...'] } } for VALIDATION_FAILED
    this.retryAfter = retryAfter; // seconds, set on RATE_LIMITED
  }
}

// ponytail: relative /api works through the Vite proxy; Phase 4 adds the deployed API's base URL
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    // fetch only throws when there's no response at all (server down, offline)
    throw new ApiError({ status: 0, code: 'INTERNAL', message: 'Could not reach the server. Is it running?' });
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: data?.error?.code ?? 'INTERNAL',
      message: data?.error?.message ?? 'Something went wrong',
      details: data?.error?.details,
      retryAfter: Number(res.headers.get('Retry-After')) || undefined,
    });
  }
  return data;
}

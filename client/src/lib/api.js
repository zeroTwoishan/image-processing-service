// The only place the client talks to the API. Every failure becomes an ApiError carrying the server's `code`,
// so the UI branches on err.code, never on message text.

const TOKEN_KEY = 'token';

// Dev: empty, so requests go to /api on Vite, which proxies them to the API. Production: the deployed API's
// address (VITE_API_URL, set on Vercel), because the client and the API live on different domains.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Fired when the server rejects our token (expired after 7 days, or the account is gone).
// AuthContext listens and logs out, so every page reacts the same way without each one handling 401.
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export class ApiError extends Error {
  constructor({ status, code, message, details, retryAfter }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details; // e.g. { fieldErrors: { password: ['...'] } } for VALIDATION_FAILED
    this.retryAfter = retryAfter; // seconds, set on RATE_LIMITED
  }
}

const networkError = () =>
  new ApiError({ status: 0, code: 'INTERNAL', message: 'Could not reach the server. Is it running?' });

// Shared by api() and uploadImage(): turns a failed response into an ApiError (and handles a dead session).
function toApiError(status, data, retryAfterHeader, sentToken) {
  if (status === 401 && sentToken) {
    tokenStore.clear();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return new ApiError({
    status,
    code: data?.error?.code ?? 'INTERNAL',
    message: data?.error?.message ?? 'Something went wrong',
    details: data?.error?.details,
    retryAfter: Number(retryAfterHeader) || undefined,
  });
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw networkError(); // fetch only throws when there's no response at all (server down, offline)
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res.status, data, res.headers.get('Retry-After'), Boolean(token));
  return data;
}

/**
 * Uploads one image as multipart/form-data and reports progress (0–100) while the bytes are sent.
 * XMLHttpRequest, not fetch: fetch still has no upload-progress events, and a 10 MB photo on mobile data
 * needs a progress bar.
 */
export function uploadImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const token = tokenStore.get();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/images`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // No Content-Type on purpose: for FormData the browser sets "multipart/form-data; boundary=…" itself.
    // Setting it by hand drops the boundary, and the server can't split the body into parts.

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // not JSON (e.g. a proxy error page); handled as INTERNAL below
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(toApiError(xhr.status, data, xhr.getResponseHeader('Retry-After'), Boolean(token)));
    };
    xhr.onerror = () => reject(networkError());

    const form = new FormData();
    form.append('image', file); // field name must match multer's .single('image')
    xhr.send(form);
  });
}

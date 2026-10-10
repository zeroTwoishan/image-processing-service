import { ApiError } from '../utils/ApiError.js';

// Runs when no route matched the request.
export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// Express knows this is an error handler because it takes 4 arguments, so `next` must stay even though it's unused.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err); // too late to send our JSON; let Express close the connection

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  // express.json() throws this when the body isn't valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Request body is not valid JSON' } });
  }

  console.error(err);
  // Never send err.message to the client: it can leak internals (file paths, query details).
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}

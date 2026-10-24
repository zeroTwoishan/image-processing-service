import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

// validateBody(schema) returns a middleware. On success, req.body is replaced by Zod's cleaned-up copy
// (trimmed, lowercased, unknown fields dropped), so controllers only ever see valid data.
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', z.flattenError(result.error));
  }
  req.body = result.data;
  next();
};

// Same idea for the query string. Express 5 made req.query a read-only getter (re-parsed on every read),
// so assigning to it throws; the cleaned copy goes on req.validatedQuery instead.
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Some query parameters are invalid', z.flattenError(result.error));
  }
  req.validatedQuery = result.data;
  next();
};

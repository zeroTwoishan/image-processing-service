// Throw this anywhere in a route; the error handler turns it into { error: { code, message, details? } }.
// Codes come from the error table in PLAN.md.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

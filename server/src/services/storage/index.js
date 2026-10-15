// The only place that decides where files live. Controllers import `storage` from here and call
// save / get / remove; they never know whether it's local disk or R2 (Phase 4 picks with STORAGE_DRIVER).
export { default as storage } from './localStorage.js';

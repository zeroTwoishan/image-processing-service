// The sign-up card a guest sees after their first download. "Not now" (or ×, or Esc) hides it for a week.

export const NUDGE_KEY = 'signupNudgeDismissedAt';
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Whether a dismissal (the stored timestamp: a string, or null if never dismissed) still hides the card at `now`. */
export function nudgeSnoozed(dismissedAt, now) {
  const at = Number(dismissedAt);
  return at > 0 && now - at < WEEK;
}

// localStorage can throw (blocked site data, some private windows). A failed read shows the card; a failed
// write only means it may come back sooner. Neither is worth breaking the page for.
export function readDismissedAt() {
  try {
    return localStorage.getItem(NUDGE_KEY);
  } catch {
    return null;
  }
}

export function rememberDismissed(now) {
  try {
    localStorage.setItem(NUDGE_KEY, String(now));
  } catch {
    // see above
  }
}

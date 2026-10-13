// Formatting for the numbers shown in Geist Mono. (From design-reference; more helpers arrive with the gallery.)

/** 42 → "0:42" */
export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

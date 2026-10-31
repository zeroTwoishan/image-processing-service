import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nudgeSnoozed } from './nudge.js';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 1);

test('the nudge shows when it was never dismissed', () => {
  assert.equal(nudgeSnoozed(null, now), false);
  assert.equal(nudgeSnoozed('garbage', now), false); // a corrupted value doesn't hide it forever
});

test('a dismissal hides the nudge for 7 days, then it can show again', () => {
  assert.equal(nudgeSnoozed(String(now - 6 * DAY), now), true);
  assert.equal(nudgeSnoozed(String(now - 7 * DAY), now), false);
});

// Run with `npm test` in client/. Node's built-in test runner: no test package needed for plain functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATS } from '../../../server/src/services/formats.js';
import {
  countChanges,
  cropProblem,
  defaultTransform,
  describeEdits,
  dragCrop,
  EXTENSIONS,
  fromApiTransform,
  keptArea,
  outputSize,
  reflectCrop,
  resizeProblem,
  rotateCrop,
  toApiTransform,
} from './transform.js';

test('the extensions shown in the name match what the server names versions', () => {
  // Two copies of one table (browser and server) can drift; this fails the moment they do.
  assert.deepEqual(EXTENSIONS, Object.fromEntries(Object.entries(FORMATS).map(([format, f]) => [format, f.ext])));
});

test('outputSize says what Apply will make (checked against Sharp on a 400×300 photo)', () => {
  const size = { width: 400, height: 300 };
  const out = (width, height) => outputSize(edit({ resize: { width, height } }), size);
  assert.deepEqual(out('', ''), { width: 400, height: 300 });
  assert.deepEqual(out('200', ''), { width: 200, height: 150 }); // one side keeps the shape
  assert.deepEqual(out('', '150'), { width: 200, height: 150 });
  assert.deepEqual(out('800', ''), { width: 400, height: 300 }); // never enlarged
  assert.deepEqual(out('300', '500'), { width: 300, height: 300 }); // each side clamped
  assert.deepEqual(out('200', '200'), { width: 200, height: 200 });
  assert.deepEqual(outputSize(edit({ rotate: 90 }), size), { width: 300, height: 400 });
});

test('rotateCrop keeps the crop on the same part of the picture', () => {
  const size = { width: 300, height: 200 };
  const crop = { x: '10', y: '20', width: '50', height: '40' };
  // 300×200 turned 90° is 200×300; the box (10,20,50,40) moves to (200−20−40, 10) and turns 40×50.
  assert.deepEqual(rotateCrop(edit({ crop }), size, 90), { x: '140', y: '10', width: '40', height: '50' });
  assert.deepEqual(rotateCrop(edit({ crop }), size, 0), crop); // no turn, no change
  // Four quarter turns come back to the start (going 90 → 0 is three more clockwise turns).
  const turned = edit({ rotate: 90, crop: rotateCrop(edit({ crop }), size, 90) });
  assert.deepEqual(rotateCrop(turned, size, 0), crop);
  assert.deepEqual(rotateCrop(edit({ crop: { x: '5', y: '', width: '', height: '' } }), size, 90), { x: '5', y: '', width: '', height: '' });
  // Mirrored, the picture on screen turns anticlockwise, so the box does too: (x, y, w, h) → (y, W − x − w, h, w).
  assert.deepEqual(rotateCrop(edit({ mirror: true, crop }), size, 90), { x: '20', y: '240', width: '40', height: '50' });
  // Flip and mirror together are a half turn, which doesn't change direction.
  assert.deepEqual(rotateCrop(edit({ flip: true, mirror: true, crop }), size, 90), { x: '140', y: '10', width: '40', height: '50' });
});

test('reflectCrop moves the box with the picture when Flip or Mirror is toggled', () => {
  const size = { width: 300, height: 200 };
  const crop = { x: '10', y: '20', width: '50', height: '40' };
  assert.deepEqual(reflectCrop(edit({ crop }), size, 'mirror'), { x: '240', y: '20', width: '50', height: '40' });
  assert.deepEqual(reflectCrop(edit({ crop }), size, 'flip'), { x: '10', y: '140', width: '50', height: '40' });
});

test('outputSize never reports a 0 px side (Sharp keeps at least 1)', () => {
  const t = edit({ crop: { x: '0', y: '0', width: '9', height: '392' }, resize: { width: '', height: '6' } });
  assert.deepEqual(outputSize(t, { width: 400, height: 400 }), { width: 1, height: 6 });
});

test('dragCrop moves and resizes the box but keeps it inside the photo', () => {
  const frame = { width: 300, height: 200 };
  const box = { x: 50, y: 50, width: 100, height: 100 };
  assert.deepEqual(dragCrop(box, 'move', 20, -10, frame), { x: 70, y: 40, width: 100, height: 100 });
  assert.deepEqual(dragCrop(box, 'move', 999, 999, frame), { x: 200, y: 100, width: 100, height: 100 }); // stops at the edge
  assert.deepEqual(dragCrop(box, 'se', 30, 20, frame), { x: 50, y: 50, width: 130, height: 120 });
  assert.deepEqual(dragCrop(box, 'nw', -999, -999, frame), { x: 0, y: 0, width: 150, height: 150 });
  assert.deepEqual(dragCrop(box, 'e', -999, 0, frame), { x: 50, y: 50, width: 16, height: 100 }); // minimum 16 px
  assert.deepEqual(dragCrop(box, 'n', 0, 10.6, frame), { x: 50, y: 61, width: 100, height: 89 }); // whole pixels
  assert.deepEqual(dragCrop(box, 'se', -999, -999, frame, 60), { x: 50, y: 50, width: 60, height: 60 }); // a larger minimum
});

const edit = (patch) => ({ ...defaultTransform('jpeg'), ...patch });

test('an untouched panel changes nothing and sends nothing', () => {
  assert.equal(countChanges(defaultTransform('png'), 'png'), 0);
  assert.deepEqual(toApiTransform(defaultTransform('png'), 'png'), {});
});

test('sends only what changes, with numbers instead of input strings', () => {
  const t = edit({ rotate: 90, crop: { x: '', y: '10', width: '200', height: '100' }, resize: { width: '600', height: '' }, watermark: '  © me ' });
  assert.deepEqual(toApiTransform(t, 'jpeg'), {
    rotate: 90,
    crop: { x: 0, y: 10, width: 200, height: 100 },
    resize: { width: 600, height: undefined }, // JSON.stringify drops the undefined side
    watermark: { text: '© me' },
  });
});

test('quality is only sent for lossy formats, and only when moved', () => {
  assert.deepEqual(toApiTransform(edit({ quality: 60 }), 'jpeg'), { compress: { quality: 60 } });
  assert.deepEqual(toApiTransform(edit({ format: 'png', quality: 60 }), 'jpeg'), { format: 'png' });
  assert.equal(countChanges(edit({ format: 'png', quality: 60 }), 'png'), 0); // png → png at any "quality" is no change
});

test('the crop is checked against the rotated size', () => {
  const size = { width: 300, height: 200 };
  const crop = { x: '0', y: '0', width: '200', height: '300' };
  assert.equal(cropProblem(edit({ crop }), size), 'The crop must fit inside 300×200.');
  assert.equal(cropProblem(edit({ rotate: 90, crop }), size), null); // 300×200 turned 90° is 200×300
  assert.equal(cropProblem(edit({ crop: { x: '5', y: '', width: '', height: '' } }), size), 'Enter a width and a height to crop.');
  assert.equal(cropProblem(edit({ crop: { x: '-1', y: '0', width: '10', height: '10' } }), size), 'Use whole numbers of pixels.');
});

test('resize sides must be whole numbers from 1 to 10000 (the server’s rule)', () => {
  for (const bad of ['0', '10.5', '-5', '20000']) assert.ok(resizeProblem(edit({ resize: { width: bad, height: '' } })), bad);
  assert.equal(resizeProblem(edit({ resize: { width: '800', height: '' } })), null);
  assert.equal(resizeProblem(edit()), null);
});

test('keptArea matches what Sharp keeps (cover + withoutEnlargement, measured on a 400×300 photo)', () => {
  const size = { width: 400, height: 300 };
  const kept = (width, height) => keptArea(edit({ resize: { width, height } }), size);
  assert.deepEqual(kept('500', '500'), { x: 0, y: 0, width: 400, height: 300 }); // too big both ways: untouched
  assert.deepEqual(kept('300', '500'), { x: 50, y: 0, width: 300, height: 300 }); // centre 300×300
  assert.deepEqual(kept('200', '200'), { x: 50, y: 0, width: 300, height: 300 }); // centre square, then scaled
  assert.deepEqual(kept('200', ''), { x: 0, y: 0, width: 400, height: 300 }); // one side: nothing cut
  // a crop narrows the area first, in the rotated frame
  assert.deepEqual(keptArea(edit({ rotate: 90, crop: { x: '0', y: '0', width: '300', height: '100' } }), size), { x: 0, y: 0, width: 300, height: 100 });
});

test('a version’s recipe round-trips into the panel (Edit from original)', () => {
  const recipe = { rotate: 270, mirror: true, crop: { x: 1, y: 2, width: 30, height: 40 }, filters: { sepia: true }, format: 'webp', compress: { quality: 55 } };
  assert.deepEqual(toApiTransform(fromApiTransform(recipe, 'jpeg'), 'jpeg'), recipe);
  assert.deepEqual(fromApiTransform(undefined, 'png'), defaultTransform('png'));
});

test('describes a version’s edits in one line', () => {
  assert.equal(describeEdits({ rotate: 90, filters: { sepia: true }, format: 'webp' }, 'jpeg'), '90° · sepia · webp · 80');
});

import { useRef } from 'react';
import { dragCrop } from '../lib/transform';
import { cx } from '../lib/ui';

const pct = (part, whole) => `${(part / whole) * 100}%`;

// The grips: corners move two sides, edges one. Each is centred on its corner or edge.
const GRIPS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
const gripStyle = (edge) => ({
  left: edge.includes('w') ? '0%' : edge.includes('e') ? '100%' : '50%',
  top: edge.includes('n') ? '0%' : edge.includes('s') ? '100%' : '50%',
  cursor: CURSOR[edge],
});

/**
 * The phone-style crop box: drag inside it to move it, drag a corner or edge to resize it. What's inside is
 * what the file will contain. Coordinates are photo pixels in the rotated frame, the same numbers as the
 * crop fields and the API, so the box and the fields always agree.
 *
 * Mouse and touch only; keyboard users type exact pixels in the crop fields, which do the same job.
 *
 * box:      { x, y, width, height } in photo pixels
 * frame:    { width, height } of the rotated photo
 * frameRef: the preview frame element, to turn screen pixels into photo pixels
 */
export function CropBox({ box, frame, frameRef, onChange }) {
  const drag = useRef(null);

  const start = (edge) => (e) => {
    if (e.button !== 0) return; // main button or a touch only; a right-click shouldn't start a resize
    e.preventDefault();
    e.stopPropagation(); // a grip sits inside the box; don't also start a move
    e.currentTarget.setPointerCapture(e.pointerId); // keep getting moves even when the pointer leaves the grip
    const shown = frameRef.current.getBoundingClientRect();
    drag.current = { edge, startX: e.clientX, startY: e.clientY, box, photoPxPerScreenPx: frame.width / shown.width };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) * d.photoPxPerScreenPx;
    const dy = (e.clientY - d.startY) * d.photoPxPerScreenPx;
    // Never smaller than ~48 screen pixels, so the grips can't pile up on a tiny box.
    const next = dragCrop(d.box, d.edge, dx, dy, frame, Math.round(48 * d.photoPxPerScreenPx));
    // Only report real changes: a tap or a 1px jitter on the untouched box mustn't create a do-nothing crop.
    if (next.x !== box.x || next.y !== box.y || next.width !== box.width || next.height !== box.height) onChange(next);
  };
  const end = () => {
    drag.current = null;
  };
  const handlers = (edge) => ({
    onPointerDown: start(edge),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end, // e.g. the window lost focus mid-drag: stop, don't keep resizing on hover
  });

  return (
    <div
      aria-hidden="true"
      // touch-none: on a phone, dragging the box must not scroll the page
      className="absolute cursor-move touch-none outline-1 outline-white/90"
      style={{ left: pct(box.x, frame.width), top: pct(box.y, frame.height), width: pct(box.width, frame.width), height: pct(box.height, frame.height) }}
      {...handlers('move')}
    >
      {/* rule-of-thirds guides, like a phone camera */}
      {['33.333%', '66.667%'].map((at) => (
        <span key={`v${at}`} className="pointer-events-none absolute inset-y-0 w-px bg-white/25" style={{ left: at }} />
      ))}
      {['33.333%', '66.667%'].map((at) => (
        <span key={`h${at}`} className="pointer-events-none absolute inset-x-0 h-px bg-white/25" style={{ top: at }} />
      ))}
      {GRIPS.map((edge) => (
        // A 32px touch target centred on the corner or edge, with a small visible mark inside it.
        <span
          key={edge}
          className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center"
          style={gripStyle(edge)}
          {...handlers(edge)}
        >
          <span
            className={cx(
              'block bg-white shadow-[0_0_2px_rgb(0_0_0/0.6)]',
              edge.length === 2 ? 'size-3 rounded-xs' : edge === 'n' || edge === 's' ? 'h-1 w-5 rounded-full' : 'h-5 w-1 rounded-full',
            )}
          />
        </span>
      ))}
    </div>
  );
}

export default CropBox;

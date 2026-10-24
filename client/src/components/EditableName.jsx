import { useRef, useState } from 'react';
import { PencilSimpleIcon } from '@phosphor-icons/react';
import { cx, focusRing, ICON } from '../lib/ui';

// "IMG_0420.jpg" → ["IMG_0420", ".jpg"]. Only the first part is editable: the extension has to match the file's
// real format, or the downloaded file won't open (the server adds the real one either way).
function splitName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
}

/**
 * The photo's name as the page heading, renamed in place: click it (or the pencil), type, Enter saves,
 * Esc cancels. Clicking away also saves, like renaming a file on a phone or in Google Drive.
 *
 * name:      the full name, e.g. "IMG_0420.jpg"
 * onRename:  async (newBaseName) => void; throws an ApiError when the server refuses
 * outputExt: the extension Apply will save with, when a different output format is picked (e.g. "webp").
 *            Shown as "IMG_0420.jpg → .webp": the photo itself (and Download) stays .jpg until Apply.
 */
export function EditableName({ name, onRename, outputExt }) {
  const [base, ext] = splitName(name);
  const [draft, setDraft] = useState(null); // null = not editing
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // A ref, not state, because it must change instantly: Enter submits and then the input blurs in the same
  // moment (that would save twice), and Esc removes the input, which can fire a blur that would save the
  // draft you just threw away. State would still hold the old value inside those handlers.
  const active = useRef(false);

  const start = () => {
    active.current = true;
    setDraft(base);
  };
  const cancel = () => {
    active.current = false;
    setDraft(null);
    setError(null);
  };

  async function save() {
    if (!active.current) return;
    const next = draft.trim();
    if (next === base) return cancel(); // nothing changed: no request
    if (!next) return setError('Enter a name.');
    if (/[/\\]/.test(next)) return setError('Names can’t contain slashes.');
    active.current = false; // one save at a time
    setSaving(true);
    try {
      await onRename(next);
      cancel();
    } catch (err) {
      active.current = true; // stay in edit mode so the name can be fixed
      setError(err.details?.fieldErrors?.name?.[0] ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  if (draft === null) {
    return (
      <h1 className="min-w-0">
        <button
          type="button"
          onClick={start}
          // aria-label replaces the button's text for screen readers, so the "→ .webp" note has to be said here too.
          aria-label={`Rename ${name}${outputExt ? `. Apply saves it as ${base}.${outputExt}` : ''}`}
          className={cx('group flex max-w-full min-w-0 items-center gap-1.5 rounded-sm text-left text-sm font-medium text-fg', focusRing)}
        >
          <span className="truncate">{name}</span>
          {outputExt && (
            <span className="shrink-0 font-mono text-[13px] text-fg-muted" title={`Apply saves it as ${base}.${outputExt}`}>
              → .{outputExt}
            </span>
          )}
          <PencilSimpleIcon size={ICON.sm} aria-hidden="true" className="shrink-0 text-fg-subtle transition-colors group-hover:text-fg" />
        </button>
      </h1>
    );
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex min-w-0 items-center gap-1 font-mono text-sm">
        <input
          // Focus lands here as soon as you click the name; it's what you asked for, not a surprise.
          autoFocus
          onFocus={(e) => e.target.select()}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && cancel()}
          onBlur={save}
          disabled={saving}
          maxLength={200}
          aria-label="Photo name"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'rename-error' : undefined}
          className="field-sizing-content min-w-24 max-w-[min(60vw,28rem)] rounded-sm border border-control-edge bg-raised px-1.5 py-0.5 text-fg focus:outline-2 focus:outline-offset-1 focus:outline-safelight"
        />
        <span className="shrink-0 text-fg-subtle">{ext}</span>
      </div>
      {error && (
        <p id="rename-error" role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export default EditableName;

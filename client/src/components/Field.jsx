import { useId } from 'react';

// Label + input + hint/error, wired together for screen readers. Extra props go to the <input>.
export default function Field({ label, hint, error, ...inputProps }) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? noteId : undefined}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-300 aria-invalid:border-red-500"
        {...inputProps}
      />
      {(error || hint) && (
        <p id={noteId} className={`text-sm ${error ? 'text-red-400' : 'text-zinc-500'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

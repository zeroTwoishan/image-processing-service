/**
 * One numbered step in the transform panel. The number is real: steps run in
 * this order. A small safelight dot marks steps that will change the image
 * when you press Apply; `summary` repeats the step's values in Geist Mono.
 */
export function TransformStep({ number, title, summary, changed = false, children }) {
  return (
    <li className="border-t border-line px-4 py-5 first:border-t-0 sm:px-5">
      <fieldset className="min-w-0">
        <legend className="mb-4 flex w-full items-center gap-3">
          <span className="w-3 font-mono text-xs text-fg-subtle tabular-nums">{number}</span>
          <span className="text-sm font-medium text-fg">{title}</span>
          <span className="ml-auto flex min-w-0 items-center gap-2">
            {summary && <span className="truncate font-mono text-xs text-fg-muted tabular-nums">{summary}</span>}
            {changed && (
              <>
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-safelight" />
                <span className="sr-only">, will be applied</span>
              </>
            )}
          </span>
        </legend>
        <div className="flex flex-col gap-4">{children}</div>
      </fieldset>
    </li>
  );
}

export default TransformStep;

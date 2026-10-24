import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Button } from './Button';

/** "Page 2 of 5" on the left, Previous / Next on the right. */
export function Pagination({ page, totalPages, onPrevious, onNext, disabled = false }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-line pt-5">
      <p aria-live="polite" className="font-mono text-[13px] text-fg-muted tabular-nums">
        Page <span className="text-fg">{page}</span> of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" icon={CaretLeftIcon} onClick={onPrevious} disabled={disabled || page <= 1} className="pl-3">
          Previous
        </Button>
        <Button variant="secondary" iconRight={CaretRightIcon} onClick={onNext} disabled={disabled || page >= totalPages} className="pr-3">
          Next
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;

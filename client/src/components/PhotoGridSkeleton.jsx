import { JustifiedList, justifiedItem } from './JustifiedList';

/** Loading state shaped like the real grid: mixed ratios and three caption lines. */
const RATIOS = [[3, 4], [4, 3], [16, 9], [3, 4], [1, 1], [4, 3], [9, 19.5], [4, 3]];

export function PhotoGridSkeleton() {
  return (
    <JustifiedList label="Loading photos" busy>
      {RATIOS.map(([w, h], i) => (
        <li key={i} aria-hidden="true" className="min-w-0" style={justifiedItem(w, h)}>
          <div className="flex flex-col gap-2.5">
            <div className="animate-develop rounded-md bg-raised" style={{ aspectRatio: `${w} / ${h}`, animationDelay: `${i * 90}ms` }} />
            <div className="flex flex-col gap-1.5 px-0.5">
              <div className="h-3 w-4/5 rounded-sm bg-raised" />
              <div className="h-3 w-3/5 rounded-sm bg-raised" />
              <div className="h-3 w-2/5 rounded-sm bg-raised" />
            </div>
          </div>
        </li>
      ))}
    </JustifiedList>
  );
}

export default PhotoGridSkeleton;

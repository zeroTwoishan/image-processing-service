import { ImageCard } from './ImageCard';
import { JustifiedList, justifiedItem } from './JustifiedList';

/** The gallery's thumbnails in justified rows. `now` comes from useNow(). */
export function PhotoGrid({ images, now, busy }) {
  return (
    <JustifiedList label="Photos" busy={busy}>
      {images.map((img) => (
        <li key={img.id} className="min-w-0" style={justifiedItem(img.width, img.height)}>
          <ImageCard image={img} now={now} />
        </li>
      ))}
    </JustifiedList>
  );
}

export default PhotoGrid;

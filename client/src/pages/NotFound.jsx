import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center">
      <h1 className="text-5xl font-semibold">404</h1>
      <p className="mt-2 text-zinc-400">This page doesn’t exist.</p>
      <Link to="/" className="mt-6 inline-block underline">
        Back to the gallery
      </Link>
    </div>
  );
}

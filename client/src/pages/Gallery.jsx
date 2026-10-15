import { useState } from 'react';
import { useNavigate } from 'react-router';
import { uploadImage } from '../lib/api.js';
import { UploadDropzone } from '../components/UploadDropzone';

// Phase 2a: the upload zone. The grid of your photos arrives in Phase 2b.
export default function Gallery() {
  const navigate = useNavigate();
  const [upload, setUpload] = useState({ status: 'idle', progress: 0, file: null, error: null });

  async function handleFile(file) {
    setUpload({ status: 'uploading', progress: 0, file, error: null });
    try {
      const { image } = await uploadImage(file, (progress) => setUpload((u) => ({ ...u, progress })));
      navigate(`/images/${image.id}`);
    } catch (err) {
      // UNSUPPORTED_FILE / FILE_TOO_LARGE / network errors: the server's message is written for people.
      // (A 401 already logged us out in api.js, and ProtectedRoute takes over.)
      setUpload({ status: 'error', progress: 0, file, error: err.message });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:px-8">
      <title>Your photos · Darkroom</title>
      <header>
        <h1 className="font-display text-[40px] leading-[1.1] tracking-[-0.03em] text-fg">Your photos</h1>
      </header>
      <UploadDropzone
        status={upload.status}
        progress={upload.progress}
        file={upload.file}
        error={upload.error}
        onFile={handleFile}
        // Checked in the browser first (type and 10 MB) for instant feedback; the server checks again.
        onReject={(code, file) => setUpload({ status: 'error', progress: 0, file, error: code })}
      />
    </main>
  );
}

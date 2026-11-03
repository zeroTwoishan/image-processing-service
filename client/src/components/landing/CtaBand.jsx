import { Link } from 'react-router';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { buttonClass } from '../Button';
import { Reveal } from './Reveal';
import { ApertureMark } from '../Wordmark';

/**
 * Last call before the footer: a spotlight band. "Upload a photo" clicks the hero dropzone's file input,
 * so it opens the file picker directly, wherever the user is on the page.
 */
export function CtaBand({ inputId }) {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden rounded-xl border border-white/[0.07] px-6 py-20 text-center sm:py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots [mask-image:radial-gradient(60%_70%_at_50%_100%,#000,transparent)]" />
      <div
        aria-hidden="true"
        className="absolute bottom-[-40%] left-1/2 -z-10 h-[90%] w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_106_61/0.45),rgb(242_54_43/0.12)_60%,transparent)] blur-2xl"
      />
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <ApertureMark className="size-14" spinning />
        <h2 id="cta-title" className="text-fg-gradient text-[36px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[56px]">
          Your next photo is <span className="font-display font-normal tracking-[-0.02em] italic">one drop</span> away.
        </h2>
        <p className="max-w-[46ch] text-[15px] text-fg-muted">Free, no account needed. Make one later if you want a gallery and versions.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => document.getElementById(inputId)?.click()} className={buttonClass('primary', undefined, 'lg')}>
            <UploadSimpleIcon size={20} aria-hidden="true" />
            Upload a photo
          </button>
          <Link to="/register" className={buttonClass('secondary', undefined, 'lg')}>
            Create free account
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export default CtaBand;

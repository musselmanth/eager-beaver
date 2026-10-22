import { useRef, useState } from 'react';
import styles from './page.module.css';

// An "About" button for the top bar that opens a dialog explaining the page.
export default function About({ clerkUrl }) {
  const dialog = useRef(null);
  const body = useRef(null);
  const tip = useRef(null);
  // Whether there's more to read below, for the "scroll for more" hint
  // (some browsers hide scrollbars until you scroll).
  const [more, setMore] = useState(false);
  const checkMore = () => {
    const el = body.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  };
  const open = () => {
    dialog.current?.showModal();
    if (body.current) body.current.scrollTop = 0;
    checkMore();
  };
  return (
    <>
      <button
        type="button"
        className={styles.aboutButton}
        onClick={open}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5.5M12 7.6v.1" />
        </svg>
        <span className={styles.aboutLabel}>About</span>
      </button>

      {/* Clicking the dimmed backdrop (the dialog itself, outside the panel) closes it. */}
      <dialog
        ref={dialog}
        className={styles.aboutDialog}
        aria-labelledby="about-title"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        {/* The header stays put while the body scrolls under it. */}
        <div className={styles.aboutHead}>
          <h2 id="about-title" className={styles.aboutTitle}>
            About this page
          </h2>
          <button type="button" className={styles.aboutClose} onClick={() => dialog.current?.close()} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div ref={body} className={styles.aboutPanel} onScroll={checkMore}>
          <p>A free, nonpartisan place to follow Albany County&apos;s local election results on election night.</p>

          <h3>Where the results come from</h3>
          <p>
            The official reports on the Albany County Clerk&apos;s{' '}
            <a href={clerkUrl} target="_blank" rel="noopener noreferrer">
              Results of Election page ↗
            </a>
            . Election night numbers are unofficial until the county certifies them.
          </p>
          <p>
            Starting at 8:00 PM on election night, a remote server checks the county&apos;s website every 2 minutes and
            downloads the results as soon as they&apos;re posted. The county&apos;s PDF is linked so you can double-check
            any number.
          </p>

          <h3>What races are included</h3>
          <p>Every race decided entirely by Albany County voters, except precinct committee races.</p>

          <h3>Who made it</h3>
          <p>Tom Musselman, a Laramie local.</p>
          <button type="button" className={styles.tipButton} onClick={() => tip.current?.showModal()} aria-haspopup="dialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM17 9.5h1.5a2.5 2.5 0 0 1 0 5H17M7 4.5v1M10.5 3.5v2M14 4.5v1" />
            </svg>
            Tip
          </button>

          <p className={styles.aboutNote}>Not an official county website. And yes, you can poke the beaver.</p>
        </div>

        <div className={`${styles.aboutMore} ${more ? styles.aboutMoreOn : ''}`} aria-hidden="true">
          Scroll for more ↓
        </div>
      </dialog>

      {/* Opens on top of the About dialog. */}
      <dialog
        ref={tip}
        className={styles.aboutDialog}
        aria-labelledby="tip-title"
        onClick={(e) => e.target === tip.current && tip.current.close()}
      >
        <div className={styles.aboutHead}>
          <h2 id="tip-title" className={styles.aboutTitle}>
            Leave a tip
          </h2>
          <button type="button" className={styles.aboutClose} onClick={() => tip.current?.close()} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className={styles.tipBody}>
          {/* Ko-fi's tip panel. Lazy, so it only loads once this dialog is opened. */}
          <iframe
            className={styles.tipFrame}
            src="https://ko-fi.com/tmusselman/?hidefeed=true&widget=true&embed=true"
            title="Tip Tom on Ko-fi"
            loading="lazy"
          />
        </div>
      </dialog>
    </>
  );
}

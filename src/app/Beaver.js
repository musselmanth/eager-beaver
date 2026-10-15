import { useEffect, useRef, useState } from 'react';
import styles from './Beaver.module.css';

const LABELS = {
  asleep: 'A beaver napping until the next check',
  checking: "A beaver checking the clerk's website on a laptop",
  sad: 'A sad beaver: no results yet',
  dancing: 'A happy beaver dancing because the results are in',
  curled: 'A beaver curled up asleep, waiting for the polls to close',
  waking: 'A beaver yawning awake, about to start checking for results',
  fakeout: 'A beaver gasping at the laptop, thinking the results might be in',
  stowing: 'A beaver putting its book away to check the laptop',
  gnawing: 'A beaver happily gnawing on an aspen branch while it waits',
  stowingBranch: 'A beaver putting its branch away to check the laptop',
  knitting: 'A beaver in reading glasses knitting a striped scarf while it waits',
  stowingKnit: 'A beaver putting its knitting away to check the laptop',
  twiddling: 'A beaver twiddling its thumbs, tapping its tail and whistling while it waits',
  reading: 'A beaver in reading glasses reading a book while it waits',
};

// Poking the beaver while it reads.
// Poking the beaver while it reads; what it says depends on the book.
// Poking the beaver while it gnaws.
// Poking the beaver while it knits.
// Poking the beaver while it twiddles its thumbs.
const TWIDDLING_POKES = [
  'Who, me? Just waiting.',
  '♪ Doo doo doo… ♪',
  'Not bored. Totally not bored.',
  'Ask me again in two minutes.',
];

const KNITTING_POKES = [
  'Shh! I’m counting stitches.',
  'Knit one, gnaw two…',
  'It’s an election night scarf.',
  'Laramie winters are no joke.',
];

const GNAWING_POKES = [
  'Mmf! Busy!',
  'Gotta keep these teeth filed down.',
  'Want a bite? …No? More for me.',
  'Aspen. A very good year.',
];

const READING_POKES = {
  dams: ['Shh, I’m reading!', 'Just one more chapter…', 'Hoover Dam is 726 feet tall!', 'Mine are… a little smaller.'],
  teeth: [
    'Shh! I’m healing my big tooth trauma.',
    'Chapter 3: “They’re not too big, they’re iconic.”',
    'Freddie Mercury had big teeth, and everyone loved him!',
    'I am more than my incisors…',
  ],
  water: [
    'Shh! I’m working on my running water issues.',
    'Step one: you don’t have to dam every stream.',
    'Do you hear a faucet?! …No. Breathe.',
    'Let it flow… let it flow… ugh, I can’t.',
  ],
};

// Poking the curled-up beaver (before checking starts) gets a grumpier
// reaction each time, then it settles back down.
const POKE_SETTLE_MS = 2500;
const POKES = [
  null,
  { level: 'stir', says: 'Mmm?' },
  { level: 'stir', says: 'Zzz… huh?' },
  { level: 'peek', says: 'Five more minutes…' },
  { level: 'peek', says: 'Still counting votes?' },
  { level: 'grumpy', says: "I'm napping!!" },
];

// Before Election Day, it would rather you went and voted early.
const POKES_EARLY_VOTING = [
  null,
  { level: 'stir', says: 'Mmm?' },
  { level: 'stir', says: 'It’s not even Election Day…' },
  { level: 'peek', says: 'You can vote early at the county courthouse!' },
  { level: 'peek', says: 'Seriously, the courthouse. Go!' },
  { level: 'grumpy', says: 'Go vote early and stop bugging me!!' },
];

// While the polls are still open, it would rather you went and voted.
const POKES_POLLS_OPEN = [
  null,
  { level: 'stir', says: 'Mmm?' },
  { level: 'stir', says: 'Shouldn’t you be voting?' },
  { level: 'peek', says: 'Polls close at 7. Go vote!' },
  { level: 'peek', says: 'Go vote and let me sleep…' },
  { level: 'grumpy', says: 'Go vote and stop bugging me!!' },
];

// Poking the beaver napping at the laptop wakes it up hoping the results are
// in, then it remembers they aren't and slumps back down.
const EXCITED_MS = 1300;
const LETDOWN_MS = 2000;
const EXCITED = ['Are they in?!', 'Results?!', 'Is it time?!'];
const LETDOWN = ['…oh. Not yet.', 'Nope. Still waiting.', 'Back to my nap…'];

// What the beaver says while checking, a different line each time.
const CHECKING = [
  'Anything yet?!',
  'Is it posted?!',
  'Come on, come on…',
  'Ooh, maybe this time!',
  'Refresh! Refresh!',
  'Results? Results?',
  'Let’s see…',
  'This could be it!',
  'Eager beaver, reporting for duty!',
  'Not to be an eager beaver, but… results?',
];

// What it calls each between-checks activity, for "Back to my ___…".
const NEXT_ACTIVITY = {
  asleep: 'nap',
  reading: 'book',
  gnawing: 'branch',
  knitting: 'knitting',
  twiddling: 'whistling',
};

// After each empty check the beaver reacts one of three ways, in turn:
// a sad cry, a face-down flop on the keyboard, or a facepalm. Each has its own lines.
const LETDOWN_POSES = ['cry', 'flop', 'facepalm'];
const FLOP_LINES = ['*Sigh*…', 'Ugh. Nothing.', 'Wake me when it’s real.', 'Zero. Zilch. Nada.'];
const FACEPALM_LINES = ['Ugh. Still nothing.', 'Why do I even check…', 'Seriously?', 'Can’t rush democracy, I guess.'];

// Twice in the night (not at random), a check gets the beaver's hopes up first.
// Keyed by check number; the value is what it says once it realizes it's nothing.
export const FAKEOUT_CHECKS = {
  5: 'Nope. Just the primary results.',
  12: 'Nope. Just a cat picture.',
};

const NO_RESULTS = [
  'Nothing yet…',
  'Still counting, I guess.',
  'Empty again. {wait}',
  'Not yet! Counting takes time.',
  'No results. Back to my {next}…',
  'The clerk’s still working on it.',
  'Patience is a beaver virtue.',
  'Any minute now… maybe.',
];

// A speech bubble sized to its text, pointing down at the beaver's head.
// Long lines wrap onto two rows, growing upward.
function Bubble({ text }) {
  const words = text.split(' ');
  const rows = [text];
  if (text.length > 20) {
    // Break at the space closest to the middle.
    let best = 1;
    for (let i = 1; i < words.length; i++) {
      const left = words.slice(0, i).join(' ').length;
      const bestLeft = words.slice(0, best).join(' ').length;
      if (Math.abs(left - text.length / 2) < Math.abs(bestLeft - text.length / 2)) best = i;
    }
    rows.splice(0, 1, words.slice(0, best).join(' '), words.slice(best).join(' '));
  }
  const width = Math.max(60, Math.max(...rows.map((r) => r.length)) * 5.1 + 18);
  const height = 10 + rows.length * 11;
  const bottom = 23;
  return (
    <g className={styles.bubbleSpot}>
      <g className={styles.bubble}>
        <rect x={67 - width / 2} y={bottom - height} width={width} height={height} rx={10.5} />
        <path d="M84 22 L94 31 L92 22 Z" />
        <text textAnchor="middle">
          {rows.map((row, i) => (
            <tspan key={i} x="67" y={bottom - height + 13.8 + i * 11}>
              {row}
            </tspan>
          ))}
        </text>
      </g>
    </g>
  );
}

// The books it reads between checks. Each cover is drawn in a 30 × 42 box.
export const BOOKS = ['dams', 'teeth', 'water'];
const BOOK_TITLES = {
  dams: 'America’s Biggest Dams',
  teeth: 'Smile Anyway: Learning to Love Your Buck Teeth',
  water: 'The Sound of Running Water: A Self-Help Guide',
};

// One cover's title and picture. `clipId` must be unique on the page.
function BookCover({ book, clipId }) {
  const name = BOOKS[book % BOOKS.length];
  const title = (lines) =>
    lines.map(([text, y, size]) => (
      <text key={text} x="15.5" y={y} fontSize={size} textAnchor="middle" className={styles.bookTitle}>
        {text}
      </text>
    ));
  return (
    <>
      <rect width="30" height="42" rx="1.2" className={`${styles.bookCover} ${styles[`cover_${name}`]}`} />
      <defs>
        <clipPath id={clipId}>
          <rect x="4" y="23.5" width="23" height="15" rx="0.8" />
        </clipPath>
      </defs>
      {name === 'dams' && (
        <>
          {title([
            ['AMERICA’S', 6.6, 3.6],
            ['BIGGEST', 13.6, 6.4],
            ['DAMS', 20.4, 6.4],
          ])}
          {/* Hoover Dam: a curved concrete wall between canyon walls, Lake Mead behind it */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="4" y="23.5" width="23" height="15" className={styles.bookSky} />
            <rect x="4" y="27.4" width="23" height="2.6" className={styles.bookWater} />
            <path
              d="M4 23.5 L9.5 25.6 L11.6 39 L4 39 Z M27 23.5 L21.8 26 L19.6 39 L27 39 Z"
              className={styles.bookCanyon}
            />
            <path d="M10.6 30 Q15.5 28.3 20.6 30.2 L19 37 Q15.5 36.2 12.2 37 Z" className={styles.bookDam} />
            <path d="M11.3 32.6 Q15.5 31.2 19.9 32.8 M11.8 35 Q15.5 33.8 19.4 35.2" className={styles.bookDamLines} />
            <rect x="12.6" y="27" width="1.1" height="3" className={styles.bookTower} />
            <rect x="17.6" y="27" width="1.1" height="3" className={styles.bookTower} />
            <path d="M4 36.4 Q15.5 35 27 36.6 V39 H4 Z" className={styles.bookWater} />
          </g>
        </>
      )}
      {name === 'teeth' && (
        <>
          {title([
            ['SMILE', 8, 6.6],
            ['ANYWAY', 15, 6.6],
            ['LEARNING TO LOVE', 18.7, 2.2],
            ['YOUR BUCK TEETH', 21.6, 2.2],
          ])}
          {/* A big proud buck-toothed grin, with a sparkle */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="4" y="23.5" width="23" height="15" className={styles.bookPink} />
            <path d="M8 26.5 Q15.5 33 23 26.5" className={styles.bookSmile} />
            <rect x="11.6" y="29.2" width="3.7" height="6.6" rx="1" className={styles.bookTooth} />
            <rect x="15.7" y="29.2" width="3.7" height="6.6" rx="1" className={styles.bookTooth} />
            <path
              d="M23.4 27 v3.4 M21.7 28.7 h3.4 M22.2 27.5 l2.4 2.4 M24.6 27.5 l-2.4 2.4"
              className={styles.bookSparkle}
            />
          </g>
        </>
      )}
      {name === 'water' && (
        <>
          {title([
            ['THE SOUND OF', 6.6, 3.4],
            ['RUNNING', 13.4, 6],
            ['WATER', 19.6, 6],
            ['A SELF-HELP GUIDE', 22.4, 1.9],
          ])}
          {/* A dripping faucet, and the stress it causes */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="4" y="23.5" width="23" height="15" className={styles.bookCalm} />
            <path d="M6.5 27.4 H15 Q17.4 27.4 17.4 29.8 V31" className={styles.bookFaucet} />
            <path d="M10.5 25.6 h4 M12.5 25.6 v1.8" className={styles.bookFaucetHandle} />
            <path
              d="M17.4 32.4 q-1 1.5 0 2.2 q1 -0.7 0 -2.2 Z M17.4 36.2 q-0.8 1.2 0 1.8 q0.8 -0.6 0 -1.8 Z"
              className={styles.bookDrop}
            />
            <path d="M21.5 27 l1.6 -1.6 M23 29.4 l2.2 -0.4 M22.6 31.8 l2 0.8" className={styles.bookStress} />
          </g>
        </>
      )}
      <rect x="4" y="23.5" width="23" height="15" rx="0.8" className={styles.bookFrame} />
    </>
  );
}

// The knitting bundle it keeps behind its back: a yarn ball with two needles
// poked through it, centered on (0, 0).
function KnittingBundle() {
  return (
    <>
      <path d="M-10 -12 L9 8 M10 -11 L-8 9" className={styles.needle} />
      <circle r="8" className={styles.yarn} />
      <path d="M-6 -4 Q0 -8 6 -3 M-7 2 Q0 -3 7 3 M-4 6 Q1 3 5 6" className={styles.yarnLines} />
    </>
  );
}

// An aspen branch, centered on (0, 0), with a pale gnawed notch and a few leaves.
function Branch() {
  return (
    <>
      <path d="M22 -1 l7 -6 M26 -4 l3 1" className={styles.twig} />
      <ellipse cx="30" cy="-8" rx="3.2" ry="2.2" transform="rotate(-30 30 -8)" className={styles.aspenLeaf} />
      <ellipse cx="31.5" cy="-2.5" rx="2.8" ry="2" transform="rotate(20 31.5 -2.5)" className={styles.aspenLeaf} />
      <rect x="-29" y="-3.6" width="56" height="7.2" rx="3.6" className={styles.bark} />
      <path d="M-20 -1 h3 M10 1 h3 M-8 1.5 h2" className={styles.barkMark} />
      <path d="M-5 -3.6 Q0 -0.4 5 -3.6 V3.6 Q0 0.4 -5 3.6 Z" className={styles.gnawed} />
    </>
  );
}

// Half-open eyes and a scowl for a poked beaver, in the head's coordinates.
function PokedFace() {
  return (
    <>
      <g className={styles.peekEye}>
        <path d="M111 60.5 a3 3 0 0 0 6 0 Z" className={styles.eye} />
        <path d="M109.5 60.5 h9" className={styles.eyesClosed} />
      </g>
      <g className={styles.grumpyFace}>
        <path d="M126 58.5 a2.5 2.5 0 0 0 5 0 Z" className={styles.eye} />
        <path d="M124.5 58.5 h7.5" className={styles.eyesClosed} />
        <path d="M109 51.5 l9 3.5 M124 54 l7.5 -3" className={styles.scowl} />
      </g>
    </>
  );
}

// A beaver who naps next to a laptop between checks, sits up to check the
// clerk's site, and looks sad when there's nothing there yet.
// `mood` is 'asleep', 'checking', 'sad', 'dancing' (results are in!), 'curled'
// (fast asleep, no laptop, before checking starts) or 'waking' (stirring from
// the curl just before the first check). The laptop is turned toward the beaver.
// While it's asleep or curled up, it can be poked.
// `checks` counts completed checks, so each sad moment gets the next line.
// `screenOn` keeps the laptop lit for a bit after the beaver dozes off.
// `pollsOpen` and `earlyVoting` change what it grumbles when poked before the polls close.
// `book` picks which book it reads (an index into BOOKS), and `next` is what it
// will do once it's done being sad, so it can say so.
export default function Beaver({
  mood,
  checks = 0,
  screenOn = false,
  pollsOpen = false,
  earlyVoting = false,
  book = 0,
  next = 'asleep',
}) {
  const [reaction, setReaction] = useState(null); // { level, says }
  const pokes = useRef(0);
  const timers = useRef([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => clearTimers, []);

  const pokeable = ['asleep', 'curled', 'reading', 'gnawing', 'knitting', 'twiddling'].includes(mood);
  const poke = pokeable ? reaction : null;

  // How it takes an empty check, and what it says about it.
  const turn = Math.max(0, checks - 1);
  const fakeoutLine = FAKEOUT_CHECKS[checks];
  const pose = fakeoutLine ? 'cry' : LETDOWN_POSES[turn % LETDOWN_POSES.length];
  const round = Math.floor(turn / LETDOWN_POSES.length);
  const lines = { cry: NO_RESULTS, flop: FLOP_LINES, facepalm: FACEPALM_LINES }[pose];
  // Lines can mention what it's about to do next ("Back to my knitting…").
  const letdownLine = (fakeoutLine ?? lines[round % lines.length])
    .replace('{next}', NEXT_ACTIVITY[next] ?? 'nap')
    .replace('{wait}', next === 'asleep' ? 'Wake me in two minutes.' : 'Check back in two minutes.');

  const says =
    poke?.says ??
    (mood === 'waking'
      ? '*Yawn*… is it 8:00?'
      : mood === 'checking'
        ? CHECKING[checks % CHECKING.length]
        : mood === 'fakeout'
          ? 'Wait… is that…?!'
          : mood === 'sad'
            ? letdownLine
            : null);
  const onPoke = () => {
    clearTimers();
    const n = pokes.current++;
    const settle = () => {
      setReaction(null);
      pokes.current = 0;
    };
    if (mood === 'twiddling') {
      setReaction({ level: 'shush', says: TWIDDLING_POKES[n % TWIDDLING_POKES.length] });
      later(POKE_SETTLE_MS, settle);
    } else if (mood === 'knitting') {
      setReaction({ level: 'shush', says: KNITTING_POKES[n % KNITTING_POKES.length] });
      later(POKE_SETTLE_MS, settle);
    } else if (mood === 'gnawing') {
      setReaction({ level: 'shush', says: GNAWING_POKES[n % GNAWING_POKES.length] });
      later(POKE_SETTLE_MS, settle);
    } else if (mood === 'reading') {
      setReaction({
        level: 'shush',
        says: READING_POKES[BOOKS[book % BOOKS.length]][n % 4],
      });
      later(POKE_SETTLE_MS, settle);
    } else if (mood === 'asleep') {
      setReaction({ level: 'excited', says: EXCITED[n % EXCITED.length] });
      later(EXCITED_MS, () => setReaction({ level: 'letdown', says: LETDOWN[n % LETDOWN.length] }));
      later(EXCITED_MS + LETDOWN_MS, settle);
    } else {
      const lines = earlyVoting ? POKES_EARLY_VOTING : pollsOpen ? POKES_POLLS_OPEN : POKES;
      setReaction(lines[Math.min(n + 1, lines.length - 1)]);
      later(POKE_SETTLE_MS, settle);
    }
  };

  const svg = (
    <svg
      viewBox="0 0 220 160"
      className={`${styles.beaver} ${styles[mood]} ${mood === 'sad' && pose !== 'cry' ? styles[pose] : ''} ${poke ? styles[poke.level] : ''} ${screenOn ? styles.screenOn : ''}`}
      role="img"
      aria-label={
        mood === 'reading'
          ? `A beaver in reading glasses reading “${BOOK_TITLES[BOOKS[book % BOOKS.length]]}”`
          : LABELS[mood]
      }
    >
      <defs>
        <radialGradient id="beaver-fur" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#a46d48" />
          <stop offset="1" stopColor="#74452a" />
        </radialGradient>
        <radialGradient id="beaver-belly" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ecc392" />
          <stop offset="1" stopColor="#c99560" />
        </radialGradient>
        <linearGradient id="beaver-tail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56392a" />
          <stop offset="1" stopColor="#3b261b" />
        </linearGradient>
        <pattern id="beaver-scales" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <path d="M0 0 H6 M0 0 V6" stroke="#2c1b12" strokeWidth="0.9" opacity="0.6" />
        </pattern>
        <radialGradient id="beaver-glow">
          <stop offset="0" stopColor="#7ff0cf" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7ff0cf" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beaver-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9ffe9" />
          <stop offset="1" stopColor="#3cc3a0" />
        </linearGradient>
        {/* The head's silhouette, drawn twice: once fat for the outline, once for the fill. */}
        <g id="beaver-head">
          <circle cx="90" cy="44" r="8" />
          <circle cx="124" cy="41" r="8" />
          <circle cx="108" cy="65" r="25" />
          <ellipse cx="113" cy="79" rx="24" ry="15" />
        </g>
      </defs>

      <ellipse cx="112" cy="150" rx="100" ry="5" className={styles.shadow} />

      {/* Curled up asleep like a loaf, head resting on its paws, tail flat behind */}
      <g className={styles.curl}>
        <ellipse cx="34" cy="138" rx="32" ry="12" transform="rotate(-6 34 138)" className={styles.tail} />
        <ellipse cx="34" cy="138" rx="32" ry="12" transform="rotate(-6 34 138)" fill="url(#beaver-scales)" />
        <path d="M48 147 C42 118 70 100 102 101 C132 102 152 118 152 147 Z" className={styles.fur} />
        {/* Haunch and tucked back foot */}
        <path d="M60 143 C58 127 72 117 90 121" className={styles.detail} />
        <ellipse cx="62" cy="146" rx="11" ry="4" className={styles.furDark} />
        <g transform="translate(30 54) rotate(8 108 65)">
          <use href="#beaver-head" className={styles.headOutline} />
          <use href="#beaver-head" className={styles.headFill} />
          <circle cx="90" cy="44" r="4" className={styles.earInner} />
          <circle cx="124" cy="41" r="4" className={styles.earInner} />
          <ellipse cx="124" cy="77" rx="15" ry="11" className={styles.belly} />
          <ellipse cx="106" cy="77" rx="5" ry="3" className={styles.blush} />
          <path d="M135 79 l12 -2 M135 82 l12 1.5 M134 85 l10 4.5" className={styles.whiskers} />
          <rect x="122" y="83" width="11" height="9" rx="2.5" className={styles.teeth} />
          <path d="M127.5 83 v9" className={styles.detail} />
          <ellipse cx="136" cy="70" rx="6.5" ry="4.6" className={styles.nose} />
          <ellipse cx="134.2" cy="68.4" rx="2" ry="1.1" className={styles.noseShine} />
          <path d="M109.5 61 q4.5 3.8 9 0 M124.5 59 q3.5 3.2 7 0" className={styles.curlEyes} />
          <PokedFace />
        </g>
        {/* Front paws tucked under the cheek, behind the teeth */}
        <ellipse cx="126" cy="146" rx="9" ry="4.5" className={styles.furDark} />
        <ellipse cx="139" cy="147" rx="8.5" ry="4.5" className={styles.fur} />
        <path d="M142 144.5 v3.5 M145 145 v3" className={styles.detail} />
      </g>

      {/* Laptop, seen from the side and angled toward the beaver */}
      <g className={styles.laptop}>
        <path d="M128 131 L174 136 L192 141 L146 137 Z" className={styles.deck} />
        <path d="M146 137 L192 141 L192 144.5 L146 140.5 Z" className={styles.edge} />
        <path d="M128 131 L146 137 L146 140.5 L128 134.5 Z" className={styles.edgeDark} />
        <path d="M137 133.5 L170 137 M140 135.3 L176 139 M151 137.7 L172 139.8" className={styles.keys} />
        <path d="M174 136 L192 141 L204 86 L186 82 Z" className={styles.lid} />
        <path d="M177 133.5 L189.5 137.2 L200.5 89.6 L187.8 85.7 Z" className={styles.screen} />
        <path
          d="M187 89.5 l7 1.6 M185.9 94.3 l9 2 M184.8 99.1 l6 1.4 M182.8 107.7 l9 2"
          className={styles.screenLines}
        />
        <circle cx="187" cy="142.6" r="0.9" className={styles.led} />
      </g>

      <g className={styles.body}>
        {/* Tail */}
        <g className={styles.tailTap}>
          <path
            d="M70 134 C56 124 24 121 13 132 C5 141 25 152 50 148 C61 146 70 142 75 138 Z"
            className={styles.tail}
          />
          <path
            d="M70 134 C56 124 24 121 13 132 C5 141 25 152 50 148 C61 146 70 142 75 138 Z"
            fill="url(#beaver-scales)"
          />
        </g>

        {/* Far arm, behind the body */}
        <g className={`${styles.typing} ${styles.armFar}`}>
          <path d="M114 104 Q133 113 148 127" className={styles.limbOutline} />
          <path d="M114 104 Q133 113 148 127" className={`${styles.limb} ${styles.limbDark}`} />
          <ellipse cx="150" cy="129" rx="6" ry="4" transform="rotate(14 150 129)" className={styles.furDark} />
        </g>

        {/* The book, closed, tucked behind the beaver: it's pulled out from behind its
            right side (toward the laptop) to read, and put back there to check. */}
        {/* The knitting, tucked behind the beaver the same way */}
        <g className={styles.knitBehind}>
          <g transform="translate(98 112)">
            <KnittingBundle />
          </g>
          <ellipse cx="108" cy="114" rx="4.8" ry="6.2" className={styles.fur} />
        </g>

        {/* The branch, tucked behind the beaver the same way */}
        <g className={styles.branchBehind}>
          <g transform="translate(95 112)">
            <Branch />
          </g>
          <ellipse cx="120" cy="112" rx="4.8" ry="6.2" className={styles.fur} />
        </g>

        <g className={styles.bookBehind}>
          {/* Same front cover as the open book, so the hand-off between them doesn't show */}
          <g transform="translate(92 96) scale(1.2)">
            <BookCover book={book} clipId={`beaver-book-picture-behind-${book}`} />
          </g>
          {/* The paw holding it, which comes out from behind the beaver with the book */}
          <ellipse cx="127" cy="127" rx="4.8" ry="6.2" className={styles.fur} />
        </g>

        <ellipse cx="90" cy="115" rx="36" ry="33" className={styles.fur} />
        <ellipse cx="102" cy="121" rx="21" ry="24" className={styles.belly} />

        {/* Feet */}
        <ellipse cx="78" cy="146" rx="12" ry="5.5" className={styles.furDark} />
        <ellipse cx="108" cy="147" rx="12.5" ry="5.5" className={styles.furDark} />
        <path d="M114 144.5 v4 M118 144.8 v3.6" className={styles.detail} />

        {/* Paws folded on the belly while napping */}
        <g className={styles.restingPaws}>
          <ellipse cx="112" cy="104" rx="8" ry="5.5" className={`${styles.furDark} ${styles.twiddleBack}`} />
          <g className={styles.twiddleFront}>
            <ellipse cx="121" cy="109" rx="7.5" ry="5" className={styles.fur} />
            <path d="M124 106.5 v3 M127 107.5 v2.6" className={styles.detail} />
          </g>
        </g>

        {/* Far arm thrown up for the dance, behind the head */}
        <g className={styles.cheer}>
          <g className={styles.cheerFar}>
            <path d="M86 98 Q75 90 71 75" className={styles.limbOutline} />
            <path d="M86 98 Q75 90 71 75" className={`${styles.limb} ${styles.limbDark}`} />
            <circle cx="70.5" cy="73" r="6" className={styles.furDark} />
          </g>
        </g>

        {/* Near arm, reaching for the keyboard */}
        <g className={`${styles.typing} ${styles.armNear}`}>
          <path d="M110 110 Q124 119 136 130" className={styles.limbOutline} />
          <path d="M110 110 Q124 119 136 130" className={styles.limb} />
          <ellipse cx="139" cy="132" rx="6.5" ry="4.2" transform="rotate(14 139 132)" className={styles.fur} />
          <path d="M141.5 129.8 l1 2.6 M144.2 130.8 l0.9 2.3" className={styles.detail} />
        </g>

        <g className={styles.head}>
          <use href="#beaver-head" className={styles.headOutline} />
          <use href="#beaver-head" className={styles.headFill} />
          <circle cx="90" cy="44" r="4" className={styles.earInner} />
          <circle cx="124" cy="41" r="4" className={styles.earInner} />
          {/* Cheek fluff */}
          <path d="M88 80 l-3 3 l4 -0.5 M90 84 l-2 3.5 l3.5 -1.5" className={styles.fluff} />
          <ellipse cx="124" cy="77" rx="15" ry="11" className={styles.belly} />
          <ellipse cx="106" cy="77" rx="5" ry="3" className={styles.blush} />
          <path d="M135 79 l12 -2 M135 82 l12 1.5 M134 85 l10 4.5" className={styles.whiskers} />
          <g className={styles.headTeeth}>
            <rect x="122" y="83" width="11" height="10" rx="2.5" className={styles.teeth} />
            <path d="M127.5 83 v10" className={styles.detail} />
          </g>
          <path d="M131 81 q-3 2.5 -8 1.2" className={`${styles.detail} ${styles.smile}`} />
          {/* Whistling: a puffed-out cheek */}
          <g className={styles.pucker}>
            <ellipse cx="111" cy="78" rx="9.5" ry="8" className={styles.puffCheek} />
            <ellipse cx="108" cy="79" rx="5.5" ry="3.4" className={styles.blush} />
          </g>
          <ellipse cx="136" cy="70" rx="6.5" ry="4.6" className={styles.nose} />
          <ellipse cx="134.2" cy="68.4" rx="2" ry="1.1" className={styles.noseShine} />

          <g className={styles.eyesOpen}>
            <path d="M109 52 q5 -3.5 10 -0.5 M124 50 q4 -2.5 8 0" className={styles.brows} />
            <circle cx="114" cy="61" r="4.4" className={styles.eye} />
            <circle cx="115.7" cy="59.3" r="1.6" className={styles.shine} />
            <circle cx="112.8" cy="62.8" r="0.7" className={styles.shine} />
            <circle cx="128" cy="59" r="3.6" className={styles.eye} />
            <circle cx="129.3" cy="57.6" r="1.3" className={styles.shine} />
          </g>
          <path d="M109.5 61 q4.5 3.8 9 0 M124.5 59 q3.5 3.2 7 0" className={styles.eyesClosed} />
          <PokedFace />

          {/* Reading glasses */}
          <g className={styles.glasses}>
            <circle cx="114" cy="61" r="6.2" />
            <circle cx="128.3" cy="59.2" r="5.2" />
            <path d="M120.2 60.6 Q121.3 58.8 123.1 59.6 M107.8 60.4 L98 57" />
          </g>

          <g className={styles.happyFace}>
            {/* Squinty smiling eyes and a big grin */}
            <path d="M109.5 62.5 q4.5 -5 9 0 M124.5 60.5 q3.5 -4.4 7 0" className={styles.eyesClosed} />
            <path d="M118.5 80 q7 4.5 14 -0.8" className={styles.grin} />
            <ellipse cx="106" cy="76" rx="6" ry="3.6" className={styles.blush} />
          </g>

          <g className={styles.sadFace}>
            {/* Droopy lids, worried brows, a frown and a tear */}
            <path
              d="M108.5 61.5 Q108.6 55.6 114 55.6 Q119.6 55.7 120 59.5 Q114 58 108.5 61.5 Z M123.5 57.5 Q123.8 54.4 128 54.4 Q132 54.6 132.5 59 Q128 56.5 123.5 57.5 Z"
              className={styles.lids}
            />
            <path d="M108.5 61.5 Q114 58 120 59.5 M123.5 57.5 Q128 56.5 132.5 59" className={styles.detail} />
            <path d="M108 54 q5 -1 11 -5.5 M124 48 q4 1 8.5 4" className={styles.brows} />
            <path d="M131 83.5 q-3.5 -2.8 -8 -0.4" className={styles.detail} />
            <path d="M110 65 q-2.4 3.4 0 5 q2.4 -1.6 0 -5 Z" className={styles.tear} />
          </g>
        </g>

        {/* Knitting: two needles clicking in front of its chest, a striped scarf hanging
            from them that grows the longer it knits, and yarn running down to a ball. */}
        <g className={styles.knit}>
          <path d="M121 112 Q112 132 98 145" className={styles.strand} />
          <g className={styles.yarnBall}>
            <circle cx="96" cy="146" r="6.5" className={styles.yarn} />
            <path
              d="M91 144 Q96 140 101 145 M90.5 148 Q96 144 102 149 M93 151.5 Q97 149 100 151"
              className={styles.yarnLines}
            />
          </g>
          {/* Held a little below the chin */}
          <g transform="translate(0 8)">
            <g className={styles.scarf}>
              <rect x="113" y="101" width="17" height="30" rx="1.5" className={styles.scarfBody} />
              <rect x="113" y="109" width="17" height="4" className={styles.scarfStripeA} />
              <rect x="113" y="119" width="17" height="4" className={styles.scarfStripeB} />
              <path
                d="M115 104 l2 2 l2 -2 M121 104 l2 2 l2 -2 M115 115 l2 2 l2 -2 M121 115 l2 2 l2 -2 M115 126 l2 2 l2 -2 M121 126 l2 2 l2 -2"
                className={styles.stitches}
              />
              <path
                d="M114.5 131 v4 M118 131 v4.5 M121.5 131 v4 M125 131 v4.5 M128.5 131 v4"
                className={styles.fringe}
              />
            </g>
            <g className={styles.needleLeft}>
              <path d="M100.6 108.4 L132 95.8" className={styles.needle} />
              <path d="M132.3 96.5 L131.7 95.1 L135.6 94.3 Z" className={styles.needleTip} />
              <circle cx="100.2" cy="108.6" r="1.7" className={styles.needleKnob} />
              <ellipse cx="105" cy="107" rx="5" ry="6" className={styles.furDark} />
            </g>
            <g className={styles.needleRight}>
              <path d="M145.4 107.3 L111.2 95.1" className={styles.needle} />
              <path d="M111.5 94.3 L110.9 95.9 L107.5 93.8 Z" className={styles.needleTip} />
              <circle cx="145.8" cy="107.5" r="1.7" className={styles.needleKnob} />
              <ellipse cx="141" cy="106" rx="5.2" ry="6.2" className={styles.fur} />
            </g>
          </g>
        </g>

        {/* Gnawing a branch like corn on the cob, with chips flying. The teeth are
            drawn again on top so they bite into it. */}
        <g className={styles.branch}>
          <g transform="translate(127 96)">
            <g className={styles.branchChew}>
              <Branch />
              <ellipse cx="-19" cy="3" rx="5" ry="6" className={styles.furDark} />
              <ellipse cx="18" cy="4" rx="5.2" ry="6.4" className={styles.fur} />
            </g>
          </g>
          <g className={styles.chips}>
            <ellipse cx="134" cy="94" rx="1.6" ry="0.9" />
            <ellipse cx="131" cy="96" rx="1.4" ry="0.8" />
            <ellipse cx="136" cy="97" rx="1.5" ry="0.8" />
          </g>
        </g>
        {/* Chomping teeth, on top of the branch: they lift and bite down on it. Kept out of
            the branch group so they don't travel with it when it's pulled out or put away. */}
        <g className={styles.chompTeeth}>
          <rect x="122" y="83" width="11" height="10" rx="2.5" className={styles.teeth} />
          <path d="M127.5 83 v10" className={styles.detail} />
        </g>

        {/* Near arm thrown up for the dance, in front of the head */}
        <g className={`${styles.cheer} ${styles.cheerNear}`}>
          <path d="M106 105 Q122 104 135 99" className={styles.limbOutline} />
          <path d="M106 105 Q122 104 135 99" className={styles.limb} />
          <circle cx="137" cy="98" r="6.5" className={styles.fur} />
        </g>

        {/* Between checks it sometimes reads. The open book faces the beaver, so we
            see the outside: the back cover on our left, the front cover (title and a
            picture of Hoover Dam) on our right, and the spine toward us in the middle,
            the covers angling up from it. */}

        <g className={styles.book}>
          {/* Drawn 20% bigger, anchored at the top so it grows down into the lap */}
          <g transform="translate(118 80) scale(1.2) translate(-118 -80)">
            {/* A page being turned: it's behind the covers, so we only see it while it
                swings up through the gap at the top. The beaver turns pages from its right
                to its left, which from our side is left to right. */}
            <path d="M116.6 84 L115.6 67.4 Q118.4 64.6 122 66.8 L119.6 84 Z" className={styles.pageTurn} />
            {/* The page-turning paw (the beaver's right, on our left), also behind the
                covers: it peeks out past the edge, then slips in behind the book to turn
                the page, staying hidden until the page is over. */}
            <ellipse cx="85.5" cy="100" rx="4.6" ry="6" className={`${styles.furDark} ${styles.pageHand}`} />
            {/* The back cover swings shut onto the front one when the book closes */}
            <g className={styles.backHinge}>
              {/* Back cover: a blurb and a barcode */}
              <g transform="translate(118 83) skewY(11) scale(-1 1)">
                <rect
                  width="30"
                  height="42"
                  rx="1.2"
                  className={`${styles.bookCover} ${styles[`cover_${BOOKS[book % BOOKS.length]}`]}`}
                />
                <g transform="translate(30 0) scale(-1 1)">
                  <path d="M5 8 H24 M5 11.5 H24 M5 15 H21 M5 18.5 H23" className={styles.bookBlurb} />
                  <rect x="16" y="31" width="9" height="6" rx="0.5" className={styles.bookBarcode} />
                  <path
                    d="M17.2 32 V36 M18.6 32 V36 M19.5 32 V36 M21 32 V36 M22.2 32 V36 M23.6 32 V36"
                    className={styles.bookBars}
                  />
                </g>
              </g>
            </g>
            {/* Front cover */}
            <g transform="translate(118 83) skewY(-11)">
              <BookCover book={book} clipId={`beaver-book-picture-${book}`} />
            </g>
            {/* Spine */}
            <rect
              x="116.6"
              y="82.6"
              width="2.8"
              height="42.8"
              rx="1.2"
              className={`${styles.bookSpine} ${styles[`spine_${BOOKS[book % BOOKS.length]}`]}`}
            />
            {/* Paws holding the outer edges */}
            <ellipse cx="147.5" cy="101" rx="4.8" ry="6.2" className={styles.fur} />
          </g>
        </g>
      </g>

      {/* Screen light falling on the beaver's face */}
      <ellipse cx="165" cy="95" rx="60" ry="52" fill="url(#beaver-glow)" className={styles.glow} />

      <g className={styles.whistle} aria-hidden="true">
        <text x="140" y="80" fontSize="9">
          ♪
        </text>
        <text x="140" y="80" fontSize="11">
          ♫
        </text>
        <text x="140" y="80" fontSize="8">
          ♪
        </text>
      </g>

      <g className={styles.zzz} aria-hidden="true">
        <text x="132" y="38" fontSize="10">
          z
        </text>
        <text x="141" y="27" fontSize="13">
          z
        </text>
        <text x="152" y="14" fontSize="16">
          Z
        </text>
      </g>

      <g className={styles.notes} aria-hidden="true">
        <text x="40" y="70" fontSize="16">
          ♪
        </text>
        <text x="160" y="50" fontSize="18">
          ♫
        </text>
        <text x="28" y="40" fontSize="13">
          ♫
        </text>
        <text x="182" y="28" fontSize="14">
          ♪
        </text>
      </g>

      {says && <Bubble key={says} text={says} />}
    </svg>
  );

  // Always the same wrapper, so the drawing stays mounted and can animate between moods.
  return (
    <button
      type="button"
      className={styles.pokeButton}
      onClick={pokeable ? onPoke : undefined}
      disabled={!pokeable}
      title={pokeable ? 'Poke the beaver' : undefined}
    >
      {svg}
    </button>
  );
}

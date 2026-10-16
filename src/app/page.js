'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import About from './About';
import Beaver, { FAKEOUT_CHECKS } from './Beaver';
import Trivia from './Trivia';
import styles from './page.module.css';
import { readReport } from './readReport';

// URL of the Cloudflare Worker in workers/results-proxy/worker.js. The county site
// doesn't send CORS headers, so the browser can't read it directly.
const PROXY_URL = 'https://albany-results-proxy.tmusselman.workers.dev/';

const CLERK_URL = 'https://www.albanycountywy.gov/176/Results-of-Election';
const ELECTION_DAY = Date.parse('2026-11-03T00:00:00-07:00');
const POLLS_CLOSE = Date.parse('2026-11-03T19:00:00-07:00');
const FIRST_PING = Date.parse('2026-11-03T20:00:00-07:00'); // an hour after polls close
const PING_INTERVAL = 2 * 60 * 1000;
const FETCH_TIMEOUT = 25 * 1000;
// Once someone has clicked through to the results, this browser skips the
// "Results are in!" screen on later visits.
const VIEWED_KEY = 'results-viewed-2026-general';
// The beaver sits up a few seconds before each check, and stays sad for a bit
// after one comes back empty before going back to sleep.
const BEAVER_WAKE_EARLY_MS = 5 * 1000;
const BEAVER_SAD_MS = 4 * 1000;
// After it dozes off, the laptop screen stays on a few seconds before going dark.
const BEAVER_SCREEN_MS = 5 * 1000;
// Before the very first check it stirs awake a few seconds before sitting up.
const BEAVER_YAWN_MS = 3 * 1000;
// On a fake-out check it gasps this long before realizing it's nothing.
const BEAVER_FAKEOUT_MS = 2 * 1000;
// What the beaver does between checks, taking turns.
const BEAVER_IDLE = ['asleep', 'reading', 'gnawing', 'knitting', 'twiddling'];
// Putting away whatever it was holding, before turning to the laptop.
const BEAVER_STOW = { reading: 'stowing', gnawing: 'stowingBranch', knitting: 'stowingKnit' };
// Putting the book away takes a moment before it turns to the laptop.
const BEAVER_STOW_MS = 1300;

// ?demo=sample shows the races from the county's 2024 general election-night report.
const SAMPLE_REPORT = { href: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/results-sample.pdf`, text: '2024 General Election Results UNOFFICIAL (sample)' };

// Races to show: local races and the state legislature, grouped in this order.
// Federal, statewide (including statewide ballot initiatives), party precinct and
// judge retention races are left out.
const HIDDEN_RACES = /UNITED STATES|GOVERNOR|SECRETARY OF STATE|STATE AUDITOR|STATE TREASURER|SUPERINTENDENT OF PUBLIC INSTRUCTION|PRECINCT COMMITTEE|CONSTITUTIONAL AMENDMENT|INITIATIVE|REFERENDUM|JUDGE|JUSTICE|JUDICIAL/i;
const RACE_GROUPS = [
  ['Laramie City Council', /CITY COUNCIL|MAYOR|CITY OF/i],
  ['Albany County', /COUNTY|CLERK OF THE DISTRICT COURT/i],
  ['Local Districts', /SCHOOL|HOSPITAL|FIRE|CONSERVATION|DISTRICT NO|CEMETERY|SPECIAL DISTRICT/i],
  ['State Legislature', /STATE SENATOR|STATE REPRESENTATIVE/i],
  ['Other Local Races', /./],
];
// A color per group, cycled in order.
const GROUP_COLORS = ['#f4b942', '#3cc3a0', '#ff7a59', '#c792ea', '#9fd356'];

function groupRaces(races) {
  const groups = RACE_GROUPS.map(([name]) => ({ name, races: [] }));
  for (const race of races) {
    if (HIDDEN_RACES.test(race.title)) continue;
    groups[RACE_GROUPS.findIndex(([, re]) => re.test(race.title))].races.push(race);
  }
  return groups.filter((g) => g.races.length).map((g, i) => ({ ...g, color: GROUP_COLORS[i % GROUP_COLORS.length] }));
}

// "08/18/2026 09:57PM" → "9:57 PM"
function reportTime(asOf) {
  const m = asOf?.match(/(\d\d?):(\d\d)\s?([AP]M)/i);
  return m ? `${Number(m[1])}:${m[2]} ${m[3].toUpperCase()}` : null;
}

const mtTime = (t, withSeconds = true) =>
  new Date(t).toLocaleTimeString('en-US', {
    timeZone: 'America/Denver',
    hour: 'numeric',
    minute: '2-digit',
    ...(withSeconds && { second: '2-digit' }),
  });

function splitDuration(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n) => String(n).padStart(2, '0');

function Countdown({ ms }) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const units = [
    ...(days > 0 ? [[days, days === 1 ? 'day' : 'days']] : []),
    [hours, 'hours'],
    [minutes, 'min'],
    [seconds, 'sec'],
  ];
  return (
    <div className={styles.countdown} role="timer">
      {units.map(([value, label], i) => (
        <div key={label} className={styles.unitWrap}>
          {i > 0 && <span className={styles.colon}>:</span>}
          <div className={styles.unit}>
            <span className={styles.digits}>{label.startsWith('day') ? value : pad(value)}</span>
            <span className={styles.unitLabel}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Small ring that fills up until the next check, and spins while checking.
function PingRing({ remaining, checking }) {
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const progress = checking ? 0.25 : 1 - remaining / PING_INTERVAL;
  return (
    <svg viewBox="0 0 24 24" className={`${styles.ring} ${checking ? styles.ringChecking : ''}`} aria-hidden="true">
      <circle cx="12" cy="12" r={r} className={styles.ringTrack} />
      <circle
        cx="12"
        cy="12"
        r={r}
        className={styles.ringBar}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
      />
    </svg>
  );
}

// General election reports prefix some names with a party, e.g. "DEM KAMALA D. HARRIS".
const party = (name) => name.match(/^(DEM|REP|LIB|CON|CST|IND|GRN|LBT)\s+(.+)$/);

// `title` is the group's name, shown above the group's first card.
function RaceCard({ race, color, title }) {
  const fmt = (n) => n.toLocaleString('en-US');
  const ranked = [...race.candidates].sort((a, b) => b.votes - a.votes);
  const max = Math.max(1, ...ranked.map((c) => c.votes));
  const pct = (votes) => (race.totalVotes ? `${((votes / race.totalVotes) * 100).toFixed(1)}%` : '—');
  return (
    <article className={`${styles.raceCard} ${title ? styles.groupStart : ''}`} style={{ '--group': color }}>
      {title && <h2 className={styles.groupTitle}>{title}</h2>}
      <h3 className={styles.raceTitle}>{race.title}</h3>
      <p className={styles.raceMeta}>
        Vote for {race.voteFor}
        {race.totalVotes > 0 && ` · ${fmt(race.totalVotes)} votes`}
      </p>
      {!race.valid ? (
        <p className={styles.raceError}>These numbers didn&apos;t add up when read from the county&apos;s report. Check the PDF.</p>
      ) : (
        <ol className={styles.candidates}>
          {ranked.map((c, i) => {
            const leading = race.totalVotes > 0 && i < race.voteFor && c.votes > 0;
            return (
              <li key={c.name} className={`${styles.candidate} ${leading ? styles.leading : ''}`}>
                <div className={styles.candidateRow}>
                  <span className={styles.candidateName}>
                    {party(c.name) && <span className={styles.party}>{party(c.name)[1]}</span>}
                    {party(c.name)?.[2] ?? c.name}
                  </span>
                  <span className={styles.candidateVotes}>
                    {fmt(c.votes)} <span className={styles.candidatePct}>{pct(c.votes)}</span>
                  </span>
                </div>
                <div className={styles.bar}>
                  <span style={{ width: `${(c.votes / max) * 100}%` }} />
                </div>
              </li>
            );
          })}
          {(race.writeIn > 0 || !ranked.length) && (
            <li className={`${styles.candidate} ${styles.writeIn}`}>
              <div className={styles.candidateRow}>
                <span className={styles.candidateName}>{ranked.length ? 'Write-ins' : 'Write-ins only'}</span>
                <span className={styles.candidateVotes}>
                  {fmt(race.writeIn ?? 0)} <span className={styles.candidatePct}>{pct(race.writeIn ?? 0)}</span>
                </span>
              </div>
            </li>
          )}
        </ol>
      )}
    </article>
  );
}

// The race results. On big screens (e.g. projected at the party) the text is
// scaled to the largest size where every race fits without scrolling; on
// phones it's a normal scrolling page.
// Small line icons for the board's buttons.
const ICONS = {
  // A big and a small "A": larger text
  textSize: 'M3 19 8 6l5 13M4.8 15h6.4M15 19l3-7 3 7M15.9 17h4.2',
  // Arrows pointing in: shrink to fit the screen
  fit: 'M15 15l6 6M15 15v4.8M15 15h4.8M9 19.8V15m0 0H4.2M9 15l-6 6M15 4.2V9m0 0h4.8M15 9l6-6M9 4.2V9m0 0H4.2M9 9 3 3',
  // Magnifying glass with a plus / minus: zoom the text in or out
  zoomIn: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4.2-4.2M8 11h6M11 8v6',
  zoomOut: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4.2-4.2M8 11h6',
  // A page of text: the county's PDF report
  document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.buttonIcon} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const FIT_MIN_WIDTH = 900;
const FIT_FONT_SIZES = [9, 30]; // px, the range to search
// "Larger text" mode: a comfortable reading size that scrolls instead of fitting.
const largeFontSize = () => Math.min(24, Math.max(17, window.innerWidth * 0.0135));
const FIT_PREF_KEY = 'results-board-fit';
// In larger-text mode, zoom steps multiply the size by ZOOM_STEP, within ZOOM_RANGE:
// one step smaller than the larger-text size, up to about double it.
const ZOOM_STEP = 1.15;
const ZOOM_RANGE = [-1, 5];
const ZOOM_PREF_KEY = 'results-board-zoom';

function RaceBoard({ results, groups, asOf, pdfLinks }) {
  const ref = useRef(null);
  // Remember each viewer's choice; storage can be unavailable, so fall back to fitting.
  const [fitAll, setFitAll] = useState(() => {
    try {
      return localStorage.getItem(FIT_PREF_KEY) !== 'large';
    } catch {
      return true;
    }
  });
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(ZOOM_PREF_KEY));
      return Number.isInteger(saved) ? Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], saved)) : 0;
    } catch {
      return 0;
    }
  });
  const changeZoom = (delta) => {
    setZoom((z) => {
      const next = Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], z + delta));
      try {
        localStorage.setItem(ZOOM_PREF_KEY, String(next));
      } catch {}
      return next;
    });
  };
  // Only offer larger text when fitting actually shrinks it below the large size.
  const [canEnlarge, setCanEnlarge] = useState(false);

  const toggleFit = () => {
    setFitAll((on) => {
      try {
        localStorage.setItem(FIT_PREF_KEY, on ? 'large' : 'fit');
      } catch {}
      return !on;
    });
  };

  useLayoutEffect(() => {
    const el = ref.current;
    const fits = () => document.scrollingElement.scrollHeight <= window.innerHeight;
    const fit = () => {
      if (window.innerWidth < FIT_MIN_WIDTH) {
        el.style.fontSize = '';
        setCanEnlarge(false);
        return;
      }
      let [lo, hi] = FIT_FONT_SIZES;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (fits()) lo = mid;
        else hi = mid;
      }
      const large = largeFontSize();
      setCanEnlarge(lo < large);
      el.style.fontSize = `${fitAll ? lo : large * ZOOM_STEP ** zoom}px`;
    };
    fit();
    // Refit once the display font has loaded, and whenever the window changes size.
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [results, fitAll, zoom]);

  return (
    <div ref={ref} className={styles.board}>
      <section className={styles.dashHead}>
        <div>
          <p className={styles.dashKicker}>
            {results.status === 'OFFICIAL' ? 'Official results' : 'Unofficial results'}
            {asOf && ` · as of ${asOf}`}
            {results.ballots > 0 && ` · ${results.ballots.toLocaleString('en-US')} ballots counted`}
          </p>
          <h1 className={styles.dashTitle}>
            <span className={styles.nowrap}>Local Election Results</span> ·{' '}
            <span className={styles.nowrap}>Albany County</span>
          </h1>
        </div>
        <div className={styles.dashLinks}>
          {(canEnlarge || !fitAll) && (
            <button type="button" className={styles.sizeToggle} onClick={toggleFit} aria-pressed={!fitAll}>
              <Icon name={fitAll ? 'textSize' : 'fit'} />
              {fitAll ? 'Larger text' : 'Fit to screen'}
            </button>
          )}
          {!fitAll && (
            <>
              <button
                type="button"
                className={`${styles.sizeToggle} ${styles.zoomButton}`}
                onClick={() => changeZoom(-1)}
                disabled={zoom <= ZOOM_RANGE[0]}
                aria-label="Smaller text"
                title="Smaller text"
              >
                <Icon name="zoomOut" />
              </button>
              <button
                type="button"
                className={`${styles.sizeToggle} ${styles.zoomButton}`}
                onClick={() => changeZoom(1)}
                disabled={zoom >= ZOOM_RANGE[1]}
                aria-label="Bigger text"
                title="Bigger text"
              >
                <Icon name="zoomIn" />
              </button>
            </>
          )}
          {pdfLinks}
        </div>
      </section>
      {/* Cards flow through newspaper-style columns so short and tall races pack together. */}
      <div className={styles.raceFlow}>
        {groups.map((g) =>
          // Keyed by position: some races share a title (e.g. a full and an unexpired term).
          g.races.map((r, i) => (
            <RaceCard key={`${g.name}-${i}`} race={r} color={g.color} title={i === 0 ? g.name : null} />
          )),
        )}
      </div>
    </div>
  );
}

function CountyBadge({ title = 'Albany County', subtitle = 'Wyoming · General Election 2026', large = false }) {
  return (
    <div className={`${styles.badge} ${large ? styles.badgeLarge : ''}`}>
      <span className={styles.badgeCounty}>{title}</span>
      <span className={styles.badgeState}>
        {/* Keep each part on one line so narrow screens break at the dot. */}
        {subtitle.split(' · ').map((part, i) => (
          <Fragment key={part}>
            {i > 0 && ' · '}
            <span className={styles.nowrap}>{part}</span>
          </Fragment>
        ))}
      </span>
    </div>
  );
}

// The results sound is synthesized so there's no sound file to host.

// Sets up a master volume and returns a function that plays one decaying sine note.
function synth(ctx, volume) {
  const t0 = ctx.currentTime + 0.05;
  const master = ctx.createGain();
  master.gain.value = volume;
  // Limit loud stacked chords so they don't distort.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.ratio.value = 12;
  master.connect(limiter).connect(ctx.destination);
  return ({ freq, start, length, peak = 1, attack = 0.01 }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0 + start);
    gain.gain.linearRampToValueAtTime(peak, t0 + start + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + length);
    osc.connect(gain).connect(master);
    osc.start(t0 + start);
    osc.stop(t0 + start + length + 0.05);
  };
}

// MIDI note number → Hz (60 = middle C).
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// A marimba-like voice: a sine that decays faster the higher it is, a quiet
// 4th harmonic (marimba bars are tuned to it), and a short mallet click.
function marimba(note) {
  return (n, start, peak = 0.6) => {
    const freq = midi(n);
    const length = Math.min(1.6, 120 / freq);
    note({ freq, start, length, peak, attack: 0.004 });
    note({ freq: freq * 4, start, length: length / 5, peak: peak * 0.15, attack: 0.002 });
    note({ freq: freq * 10, start, length: 0.03, peak: peak * 0.05, attack: 0.001 });
  };
}

// Plays a short marimba tune: a melody over a bass line, a rolled C major
// chord to finish, and glockenspiel sparkles on top. Times are in 16th notes;
// notes are MIDI numbers.
function playTune(ctx, { step, melody, bass, sparkles }) {
  const note = synth(ctx, 0.4);
  const mallet = marimba(note);
  melody.forEach(([t, n, v = 0.6]) => mallet(n, t * step, v));
  bass.forEach(([t, n]) => mallet(n, t * step, 0.9));
  sparkles.forEach(([t, n]) => note({ freq: midi(n), start: t * step, length: 0.6, peak: 0.12 }));

  // Roll the final chord: alternate mallets fast, swelling, then one last hit.
  const rollStart = Math.max(...melody.map(([t]) => t)) + 2;
  const roll = [72, 79, 76, 84];
  for (let i = 0; i < 12; i++) {
    const swell = 0.25 + 0.35 * Math.sin((i / 12) * Math.PI);
    mallet(roll[i % roll.length], (rollStart + i * 0.5) * step, swell);
  }
  const end = (rollStart + 6) * step;
  [36, 48, 72, 76, 79, 84].forEach((n) => mallet(n, end, n < 60 ? 1 : 0.7));
  // Shimmer over the last chord.
  [96, 100, 103, 108].forEach((n, i) => note({ freq: midi(n), start: end + i * 0.06, length: 1.8, peak: 0.1 }));
}

// The tune that plays when results come in: a syncopated 3-3-2 island groove.
// It runs about 10 seconds, so the beaver on the "Results are in!" screen has
// something to dance to. Each line below is one bar (8 sixteenth notes).
const RESULT_TUNE = {
  step: 0.085,
  melody: [
    [0, 72], [3, 76], [6, 79, 0.75], // C
    [8, 77], [11, 76], [14, 74], // F, G
    [16, 72], [19, 76], [22, 79, 0.75], // C
    [24, 84, 0.9], [27, 83], [30, 79], // G
    [32, 76], [34, 79], [35, 81], [38, 79], // C
    [40, 77], [43, 81], [46, 84, 0.8], // F
    [48, 83], [50, 81], [51, 79], [54, 74], // G
    [56, 76], [59, 72], [62, 79, 0.75], // C
    [64, 81], [67, 84], [70, 88, 0.85], // Am
    [72, 86], [75, 84], [78, 81], // F
    [80, 83], [82, 86], [83, 83], [86, 79], // G
    [88, 74], [90, 77], [91, 79], [94, 83], // G, walking up
    [96, 84, 0.9], // C, then the rolled final chord
  ],
  bass: [
    [0, 48], [3, 55], [6, 48],
    [8, 41], [11, 48], [14, 43],
    [16, 48], [19, 55], [22, 43],
    ...[[24, 43], [32, 48], [40, 41], [48, 43], [56, 48], [64, 45], [72, 41], [80, 43]].flatMap(([t, n]) => [
      [t, n], [t + 3, n + 7], [t + 6, n],
    ]),
    [88, 43], [91, 47], [94, 50],
  ],
  sparkles: [[6, 91], [14, 98], [22, 103], [46, 96], [62, 98], [70, 100], [86, 103], [94, 98], [94.5, 103]],
};

// Deterministic confetti so render stays pure.
const CONFETTI = Array.from({ length: 60 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 40) / 10,
  duration: 3 + ((i * 29) % 30) / 10,
  color: ['#f4b942', '#ff7a59', '#3cc3a0', '#f6f1e4', '#c792ea', '#9fd356'][i % 6],
  rotate: (i * 71) % 360,
}));

export default function ResultsPage() {
  const [now, setNow] = useState(null);
  const [demo, setDemo] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkEndedAt, setCheckEndedAt] = useState(null);
  const [nextPingAt, setNextPingAt] = useState(null);
  const [lastCheck, setLastCheck] = useState(null); // { at, ok, error }
  const [checkCount, setCheckCount] = useState(0);
  const [results, setResults] = useState(null);
  // When results arrived while the page was open (for the fanfare and title flash).
  const [arrivedLiveAt, setArrivedLiveAt] = useState(0);
  // Whether this browser has clicked through to the results.
  const [viewed, setViewed] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const audioRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  const offsetRef = useRef(0);
  const demoRef = useRef(false);
  const checkingRef = useRef(false);
  const nextPingRef = useRef(0);
  const foundRef = useRef(false);
  // Whether a check has come back without results, i.e. we're watching them arrive live.
  const waitedRef = useRef(false);

  useEffect(() => {
    // ?demo=sample shows the 2024 sample report right away, without the county site.
    // ?at=2026-11-03T18:59:50-07:00 pretends the page was opened at that time.
    const params = new URLSearchParams(window.location.search);
    const sample = params.get('demo') === 'sample';
    // Skip the "Results are in!" screen if this browser has already seen the results.
    // The demo always shows it, so it can be tried again and again.
    try {
      if (!sample && localStorage.getItem(VIEWED_KEY)) setViewed(true);
    } catch {}
    demoRef.current = sample;
    const at = Date.parse(params.get('at') || '');
    offsetRef.current = Number.isNaN(at) ? 0 : at - Date.now();
    const clock = () => Date.now() + offsetRef.current;
    const firstPing = sample ? -Infinity : FIRST_PING;

    // Which election's report we're waiting for.
    const election = sample ? /\d{4} General/i : /2026 General/i;
    // For a scanned report we can't read the election name, so go by the link text.
    const scanLinkMatches = (text) => /2026/.test(text) && /general/i.test(text);

    // What we read from each report version, by PDF hash (or link when there's no hash).
    const reads = new Map();

    function read(report) {
      const key = report.hash ?? report.href;
      if (!reads.has(key)) {
        const url = sample ? report.href : `${PROXY_URL}?pdf=${encodeURIComponent(report.href)}`;
        const promise = fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT) })
          .then((res) => {
            if (!res.ok) throw new Error(`Couldn't download the report (${res.status})`);
            return res.arrayBuffer();
          })
          .then((bytes) => readReport(new Uint8Array(bytes)));
        // Retry failed downloads on the next check.
        promise.catch(() => reads.delete(key));
        reads.set(key, promise);
      }
      return reads.get(key);
    }

    async function check() {
      checkingRef.current = true;
      setChecking(true);
      // When the worker's shared view of the clerk site was fetched.
      let fetchedAt = clock();
      try {
        let data;
        if (sample) {
          data = { ok: true, ageMs: 0, reports: [SAMPLE_REPORT], changedAt: null };
        } else {
          if (!PROXY_URL) throw new Error('Results proxy not configured');
          const res = await fetch(`${PROXY_URL}?_=${Date.now()}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
          });
          if (!res.ok) throw new Error(`Results proxy returned ${res.status}`);
          data = await res.json();
        }
        fetchedAt = clock() - (data.ageMs || 0);
        if (!data.ok) throw new Error(data.error);

        // The county posts an empty report before there are votes in it, so read
        // each report and only count it once it shows ballots cast.
        const reports = (await Promise.all(data.reports.map(async (r) => ({ ...r, ...(await read(r)) })))).filter((r) =>
          r.hasText ? election.test(r.election ?? '') : scanLinkMatches(r.text),
        );
        const counted = reports.filter((r) => r.ballotsCast > 0);
        // Prefer a report we could read in full, then the one with the most ballots.
        const best = counted.sort((a, b) => (b.races?.length ?? 0) - (a.races?.length ?? 0) || b.ballotsCast - a.ballotsCast)[0];
        // If a scanned report couldn't be read at all, fall back to the worker noticing it changed.
        const unreadable = reports.some((r) => !r.hasText && r.ballotsCast === null);
        const changed = !best && data.changedAt && unreadable;

        if (best || changed) {
          foundRef.current = true;
          // Only play the fanfare and flash the title if we were here when the results arrived.
          if (waitedRef.current || sample) setArrivedLiveAt(clock());
          setResults({
            links: reports.map(({ href, text }) => ({ href, text })),
            ballots: best?.ballotsCast ?? null,
            races: best?.races ?? [],
            status: best?.status ?? null,
            asOf: best?.asOf ?? null,
            at: best ? fetchedAt : data.changedAt + offsetRef.current,
          });
        }
        const known = reports.map((r) => r.ballotsCast).filter((b) => b !== null);
        if (!foundRef.current) waitedRef.current = true;
        setLastCheck({ at: fetchedAt, ok: true, posted: reports.length > 0, counted: known.length ? Math.max(...known) : null });
      } catch (err) {
        setLastCheck({ at: fetchedAt, ok: false, error: err.name === 'TimeoutError' ? 'Request timed out' : err.message });
      } finally {
        setCheckCount((c) => c + 1);
        // Check again just after the worker's copy expires, so every open page
        // picks up each fresh copy within seconds of the worker fetching it.
        nextPingRef.current = Math.max(fetchedAt + PING_INTERVAL + 3000, clock() + 10000);
        setNextPingAt(nextPingRef.current);
        checkingRef.current = false;
        setChecking(false);
        setCheckEndedAt(clock());
      }
    }

    const tick = () => {
      const t = clock();
      setNow(t);
      setDemo(demoRef.current);
      // The county posts results once they're all counted, so stop checking once we have them.
      if (t >= firstPing && !foundRef.current && !checkingRef.current && t >= nextPingRef.current) {
        check();
      }
    };

    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  // Keep the screen awake on the party TV.
  useEffect(() => {
    let lock;
    const request = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen');
      } catch {}
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, []);

  // Flash the tab title for 30 seconds when results come in or update.
  // Only for results that arrived while the page was open (the same ones that get the fanfare).
  const resultsKey = results && arrivedLiveAt ? `${results.at}|${results.asOf}` : null;
  useEffect(() => {
    if (!resultsKey) return;
    const title = 'Albany County, WY Results Watch';
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? '🚨 RESULTS ARE IN! 🚨' : title;
    }, 1000);
    const stop = setTimeout(() => {
      clearInterval(id);
      document.title = title;
    }, 30 * 1000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
      document.title = title;
    };
  }, [resultsKey]);

  // Track full screen state so the button label stays right when Esc exits it.
  useEffect(() => {
    const sync = () => {
      setCanFullscreen(document.fullscreenEnabled);
      setFullscreen(Boolean(document.fullscreenElement));
    };
    const first = setTimeout(sync, 0);
    document.addEventListener('fullscreenchange', sync);
    return () => {
      clearTimeout(first);
      document.removeEventListener('fullscreenchange', sync);
    };
  }, []);

  // Browsers only allow audio after someone interacts with the page, so unlock it
  // on the first tap or key press (e.g. hitting full screen on the party TV).
  const unlockAudio = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioRef.current ??= new AudioContext();
    audioRef.current.resume().catch(() => {});
    return audioRef.current;
  };

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Play the fanfare when results arrive while the page is open.
  useEffect(() => {
    const ctx = audioRef.current;
    if (arrivedLiveAt && ctx?.state === 'running') playTune(ctx, RESULT_TUNE);
  }, [arrivedLiveAt]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  if (now === null) return <main className={styles.page} />;

  const polling = demo || now >= FIRST_PING;

  const header = (
    <header className={styles.topBar}>
      <span className={styles.live}>
        <span className={styles.liveDot} />
        Election Night 2026
      </span>
      <About clerkUrl={CLERK_URL} />
      <span className={styles.topRight}>
        <span className={styles.clock}>{mtTime(now)} MT</span>
        {canFullscreen && (
          <button
            type="button"
            className={styles.fullscreenButton}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
            title={fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d={
                  fullscreen
                    ? 'M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6'
                    : 'M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6'
                }
              />
            </svg>
          </button>
        )}
      </span>
    </header>
  );

  if (results) {
    const groups = groupRaces(results.races);
    const asOf = reportTime(results.asOf);
    const pdfLinks = results.links.map((l) => (
      <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={styles.resultButton}>
        <Icon name="document" />
        {l.text}
        <span aria-hidden="true" className={styles.buttonArrow}>
          →
        </span>
      </a>
    ));

    const viewResults = () => {
      setViewed(true);
      if (demo) return;
      try {
        localStorage.setItem(VIEWED_KEY, '1');
      } catch {}
    };

    if (!viewed || !groups.length) {
      return (
        <main className={`${styles.page} ${styles.found}`}>
          <div className={styles.confetti} aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                style={{
                  left: `${c.left}%`,
                  background: c.color,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  rotate: `${c.rotate}deg`,
                }}
              />
            ))}
          </div>
          {header}
          <div className={styles.foundContent}>
            <CountyBadge />
            <p className={styles.kicker}>Posted {mtTime(results.at, false)} MT</p>
            <h1 className={styles.foundTitle}>Results are in!</h1>
            {results.ballots > 0 && (
              <p className={styles.ballots}>{results.ballots.toLocaleString('en-US')} ballots counted</p>
            )}
            {groups.length > 0 ? (
              <button type="button" className={`${styles.resultButton} ${styles.viewButton}`} onClick={viewResults}>
                View the results
                <span aria-hidden="true" className={styles.buttonArrow}>
                  →
                </span>
              </button>
            ) : (
              <div className={styles.foundLinks}>{pdfLinks}</div>
            )}
            <div className={styles.beaverSpot}>
              <Beaver mood="dancing" />
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className={styles.page}>
        <div className={styles.glowA} aria-hidden="true" />
        <div className={styles.glowB} aria-hidden="true" />
        {header}
        <RaceBoard results={results} groups={groups} asOf={asOf} pdfLinks={pdfLinks} />
      </main>
    );
  }

  let kicker, heading, body, beaver;
  if (polling) {
    kicker = 'Polls are closed · Watching for results';
    heading = null;
    const nextIn = Math.max(0, Math.ceil(((nextPingAt ?? now) - now) / 1000));
    // We only get here while there are no results, so every finished check is a sad one.
    // `now` updates every 250ms, so right after a check it can be a little behind
    // checkEndedAt; clamp so a negative gap doesn't count as "inside the fake-out".
    const sinceCheck = checkEndedAt === null ? Infinity : Math.max(0, now - checkEndedAt);
    const fakeoutMs = FAKEOUT_CHECKS[checkCount] ? BEAVER_FAKEOUT_MS : 0;
    const idle = BEAVER_IDLE[checkCount % BEAVER_IDLE.length];
    const wakeAt = nextPingAt === null ? Infinity : nextPingAt - BEAVER_WAKE_EARLY_MS;
    const beaverMood =
      !checking && BEAVER_STOW[idle] && now >= wakeAt && now < wakeAt + BEAVER_STOW_MS
        ? BEAVER_STOW[idle]
        : checking || now >= wakeAt
          ? 'checking'
          : sinceCheck < fakeoutMs
            ? 'fakeout'
            : sinceCheck < fakeoutMs + BEAVER_SAD_MS
              ? 'sad'
              : idle;
    let statusMain = 'Starting first check…';
    let statusSub = null;
    if (lastCheck?.ok) {
      statusMain = !lastCheck.posted
        ? 'No results yet'
        : lastCheck.counted === 0
          ? 'Empty report posted · 0 ballots counted'
          : "Report posted, but we couldn't read it yet";
      statusSub = `Last checked ${mtTime(lastCheck.at, false)} MT`;
    } else if (lastCheck) {
      statusMain = "Couldn't reach the clerk's site";
      statusSub = `${lastCheck.error} · will try again`;
    }
    beaver = {
      mood: beaverMood,
      // A different book each time it reads (it reads after every third check).
      book: Math.floor(checkCount / BEAVER_IDLE.length),
      // What it does after this check's reaction, so it can mention it.
      next: idle,
      checks: checkCount,
      screenOn: sinceCheck < fakeoutMs + BEAVER_SAD_MS + BEAVER_SCREEN_MS,
    };
    body = (
      <>
        <div className={styles.statusBlock} aria-live="polite">
          <p className={styles.statusMain}>{statusMain}</p>
          {statusSub && <p className={styles.statusSub}>{statusSub}</p>}
        </div>
        <p className={styles.nextCheck}>
          <PingRing remaining={nextPingAt === null ? 0 : nextPingAt - now} checking={checking} />
          {checking ? 'Checking now…' : `Next check in ${Math.floor(nextIn / 60)}:${pad(nextIn % 60)}`}
          {checkCount > 0 && <span className={styles.checkCount}>· check #{checkCount}</span>}
        </p>
      </>
    );
  } else if (now < POLLS_CLOSE) {
    kicker = 'Election Day · Tuesday, November 3';
    heading = 'Polls close in';
    body = (
      <>
        <Countdown ms={POLLS_CLOSE - now} />
        <p className={styles.status}>Polls close at 7:00 PM MT across Albany County</p>
      </>
    );
    beaver = { mood: 'curled', pollsOpen: true, earlyVoting: now < ELECTION_DAY };
  } else {
    kicker = 'Polls are closed!';
    heading = 'Checking for results in';
    body = (
      <>
        <Countdown ms={FIRST_PING - now} />
        <p className={styles.status}>We&apos;ll start checking the Albany County Clerk&apos;s site at 8:00 PM MT</p>
      </>
    );
    // Wake up gradually for the first check: stir, then sit up at the laptop
    // (the same early wake-up as every later check), so 8:00 is seamless.
    const untilFirst = FIRST_PING - now;
    beaver = {
      mood:
        untilFirst <= BEAVER_WAKE_EARLY_MS
          ? 'checking'
          : untilFirst <= BEAVER_WAKE_EARLY_MS + BEAVER_YAWN_MS
            ? 'waking'
            : 'curled',
    };
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowA} aria-hidden="true" />
      <div className={styles.glowB} aria-hidden="true" />
      {header}
      <section className={styles.content}>
        <CountyBadge title="Local Election Results" subtitle="Albany County, Wyoming · General Election 2026" large />
        <p className={styles.kicker}>{kicker}</p>
        {heading && <h1 className={styles.heading}>{heading}</h1>}
        {body}
        {/* One beaver across the waiting screens, so it animates between poses instead of being swapped out. */}
        <div className={styles.beaverSpot}>
          <Beaver {...beaver} />
        </div>
        {/* Trivia starts once the polls close (or in demo mode, which skips ahead to checking). */}
        {(polling || now >= POLLS_CLOSE) && <Trivia now={now} />}
      </section>
    </main>
  );
}

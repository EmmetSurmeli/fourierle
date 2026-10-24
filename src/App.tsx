import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Globe2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Share2,
  SlidersHorizontal,
  Sun,
  Moon,
  X,
  Orbit,
} from 'lucide-react';
import { FourierCanvas } from './Canvas';
import {
  Archive,
  Country,
  Game,
  Geometry,
  DAY,
  EPOCH,
  VERSION,
  order,
  dailyCountry,
  guess,
  loadArchive,
  matches,
  newGame,
  normalize,
  shareText,
  setDifficulty,
  stats,
  utcDay,
  visibleStage,
} from './engine';
const Lab = lazy(() => import('./Lab'));
const KEY = `fourierle-${VERSION}`;
function readDifficulty(): Game['difficulty'] {
  try {
    return localStorage.getItem('fourierle-difficulty') === 'easy' ? 'easy' : 'hard';
  } catch {
    return 'hard';
  }
}
function read() {
  try {
    return loadArchive(localStorage.getItem(KEY));
  } catch {
    return loadArchive(null);
  }
}
function readPractice() {
  const empty = {
    game: null as Game | null,
    scores: { wins: 0, losses: 0 },
    recent: [] as string[],
  };
  try {
    const s = JSON.parse(sessionStorage.getItem('fourierle-practice') || 'null');
    if (!s || s.version !== 1) return empty;
    let g: Game | null = null;
    if (
      s.game &&
      order.includes(s.game.answer) &&
      Number.isInteger(s.game.day) &&
      Array.isArray(s.game.guesses) &&
      s.game.guesses.length <= 6
    ) {
      g = newGame(s.game.day, s.game.answer, s.game.difficulty === 'easy' ? 'easy' : 'hard');
      if (s.game.assisted === true) g.assisted = true;
      for (const id of s.game.guesses) g = guess(g, id);
    }
    const scores = {
      wins: Number.isSafeInteger(s.scores?.wins) && s.scores.wins >= 0 ? s.scores.wins : 0,
      losses: Number.isSafeInteger(s.scores?.losses) && s.scores.losses >= 0 ? s.scores.losses : 0,
    };
    return {
      game: g,
      scores,
      recent: Array.isArray(s.recent)
        ? s.recent.filter((id: string) => order.includes(id)).slice(-20)
        : [],
    };
  } catch {
    return empty;
  }
}
function countdown(now: number) {
  const s = Math.ceil((DAY - ((((now - EPOCH) % DAY) + DAY) % DAY)) / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const [archive, setArchive] = useState<Archive>(read);
  const [now, setNow] = useState(Date.now());
  const day = utcDay(now);
  const [session] = useState(readPractice);
  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [preferredDifficulty, setPreferredDifficulty] = useState(readDifficulty);
  const [practice, setPractice] = useState<Game | null>(session.game);
  const recent = useRef<string[]>(session.recent);
  const [practiceScores, setPracticeScores] = useState(session.scores);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'fourierle-practice',
        JSON.stringify({
          version: 1,
          game: practice,
          scores: practiceScores,
          recent: recent.current,
        }),
      );
    } catch {}
  }, [practice, practiceScores]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<'help' | 'stats' | 'settings' | null>(null);
  const [paused, setPaused] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [circles, setCircles] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('fourierle-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [explorer, setExplorer] = useState(false);
  const [exploreCount, setExploreCount] = useState(32);
  const [compare, setCompare] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const game =
    mode === 'daily'
      ? archive.days[day] || newGame(day, dailyCountry(day), preferredDifficulty)
      : practice || newGame(day, dailyCountry(day), preferredDifficulty);
  const done = game.status !== 'playing';
  const stage = Math.min(game.guesses.length, 5);
  const drawingStage = visibleStage(game);
  const dailyStats = stats(archive, day);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const update = () => setNow(Date.now());
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    setQuery('');
    setMessage('');
    setExplorer(false);
    setOpen(false);
  }, [day, mode, game.answer]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === KEY) setArchive(read());
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('fourierle-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/countries.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setCountries)
      .catch((e) => {
        if (e.name !== 'AbortError') setLoadError('Country list could not load. Please retry.');
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    setGeometry(null);
    setLoadError('');
    fetch(`/data/${game.answer}.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setGeometry)
      .catch((e) => {
        if (e.name !== 'AbortError') setLoadError('The puzzle could not load. Please retry.');
      });
    return () => controller.abort();
  }, [game.answer, retry]);
  const options = countries
    .filter((c) => matches(c, query) && !game.guesses.includes(c.id))
    .slice(0, 8);
  const freshPractice = () => {
    const pool = countries.filter(
      (c) => !recent.current.includes(c.id) && c.id !== dailyCountry(day),
    );
    if (!pool.length) return;
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    const id = pool[a[0] % pool.length].id;
    recent.current = [...recent.current.slice(-19), id];
    setPractice(newGame(day, id, preferredDifficulty));
    setMode('practice');
    setExplorer(false);
  };
  function changeDifficulty(difficulty: Game['difficulty']) {
    setPreferredDifficulty(difficulty);
    try {
      localStorage.setItem('fourierle-difficulty', difficulty);
    } catch {}
    if (done) return;
    if (mode === 'daily') {
      const currentArchive = read();
      const current = currentArchive.days[day] || game;
      const updated = {
        ...currentArchive,
        days: { ...currentArchive.days, [day]: setDifficulty(current, difficulty) },
      };
      setArchive(updated);
      try {
        localStorage.setItem(KEY, JSON.stringify(updated));
      } catch {
        setStorageError(true);
      }
    } else {
      setPractice(setDifficulty(game, difficulty));
    }
  }
  function submit(id?: string) {
    if (utcDay() !== day) {
      setNow(Date.now());
      setMessage('A new UTC day has begun. Here is your new puzzle.');
      return;
    }
    if (done || !geometry) return;
    const exact = countries.find((c) =>
      [c.name, ...c.aliases].some((s) => normalize(s) === normalize(query)),
    );
    const chosen = id || exact?.id;
    if (!chosen) {
      setMessage('Choose a country from the suggestions.');
      setOpen(true);
      return;
    }
    if (game.guesses.includes(chosen)) {
      setMessage('You have already guessed that country. Try another.');
      return;
    }
    // Re-read storage on submission to avoid overwriting another tab's newer daily progress.
    const currentArchive = read();
    const current = mode === 'daily' ? currentArchive.days[day] || game : game;
    const next = guess(current, chosen);
    if (mode === 'daily') {
      const updated = { ...currentArchive, days: { ...currentArchive.days, [day]: next } };
      setArchive(updated);
      try {
        localStorage.setItem(KEY, JSON.stringify(updated));
      } catch {
        setStorageError(true);
      }
    } else {
      setPractice(next);
      if (next.status !== 'playing' && current.status === 'playing')
        setPracticeScores((s) => ({
          ...s,
          [next.status === 'won' ? 'wins' : 'losses']:
            s[next.status === 'won' ? 'wins' : 'losses'] + 1,
        }));
    }
    setQuery('');
    setOpen(false);
    setMessage(
      next.status === 'won'
        ? 'Correct! You found the country.'
        : next.status === 'lost'
          ? 'Six guesses used. The country is revealed below.'
          : 'Not quite. More circles, more clues.',
    );
  }
  async function share() {
    const text = shareText(game, location.origin);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setMessage('Result copied to clipboard.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessage('Copy your result below.');
        setModal('stats');
      }
    }
  }
  if (import.meta.env.DEV && location.search.includes('lab'))
    return (
      <Suspense fallback={<p>Loading calibration lab…</p>}>
        <Lab />
      </Suspense>
    );
  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="/" aria-label="Fourierle home">
          <span className="brand-orbit">
            <Orbit size={28} />
          </span>
          fourierle<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Game information">
          <button className="icon-button" onClick={() => setModal('help')} aria-label="How to play">
            <CircleHelp size={21} />
          </button>
          <button className="icon-button" onClick={() => setModal('stats')} aria-label="Statistics">
            <BarChart3 size={21} />
          </button>
          <button
            className="icon-button"
            onClick={() => setModal('settings')}
            aria-label="Settings"
          >
            <Settings2 size={21} />
          </button>
        </nav>
      </header>
      <main>
        <section className="intro">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> A DAILY GEOGRAPHY PUZZLE
          </div>
          <h1>
            A world of shapes.
            <br />
            <em>One country to find.</em>
          </h1>
          <p>Guess the country. One circle at a time.</p>
        </section>
        <div className="mode-switch" aria-label="Game mode">
          <button className={mode === 'daily' ? 'selected' : ''} onClick={() => setMode('daily')}>
            <Globe2 size={14} /> Daily puzzle
          </button>
          <button
            className={mode === 'practice' ? 'selected' : ''}
            disabled={!countries.length}
            onClick={() => (practice ? setMode('practice') : freshPractice())}
          >
            <RotateCcw size={14} /> Practice
          </button>
        </div>
        <div className="difficulty-control" role="group" aria-label="Difficulty">
          <span>DIFFICULTY</span>
          <div className="difficulty-switch">
            <button
              type="button"
              className={game.difficulty === 'easy' ? 'selected' : ''}
              aria-pressed={game.difficulty === 'easy'}
              disabled={done}
              onClick={() => changeDifficulty('easy')}
            >
              Easy
            </button>
            <button
              type="button"
              className={game.difficulty === 'hard' ? 'selected' : ''}
              aria-pressed={game.difficulty === 'hard'}
              disabled={done}
              onClick={() => changeDifficulty('hard')}
            >
              Hard
            </button>
          </div>
          <small>
            {game.difficulty === 'easy'
              ? '4 circles to start + continent and letter hints'
              : 'The original challenge'}
          </small>
        </div>
        <section className="puzzle" aria-label="Country puzzle">
          <div className="puzzle-top">
            <span>
              {mode === 'daily' ? `NO. ${String(day + 1).padStart(3, '0')}` : 'PRACTICE'}{' '}
              <span className="separator">/</span>{' '}
              {mode === 'daily'
                ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                    .format(now)
                    .toUpperCase()
                : 'NO LIMITS'}
            </span>
            <span className="live-label">
              <i />
              {done ? 'COUNTRY REVEALED' : `GUESS ${stage + 1} OF 6`}
            </span>
          </div>
          <div className="drawing-area">
            <div className="axis axis-top" aria-label="North is up">
              ↑ NORTH
            </div>
            <span className="corner corner-tl" />
            <span className="corner corner-tr" />
            <span className="corner corner-bl" />
            <span className="corner corner-br" />
            {geometry ? (
              <FourierCanvas
                geometry={geometry}
                count={
                  explorer
                    ? exploreCount
                    : done
                      ? geometry.stages[5]
                      : geometry.stages[drawingStage]
                }
                paused={paused}
                circles={circles}
                speed={speed}
                exact={!explorer && (done || (drawingStage === 5 && geometry.exactFallback))}
                compare={compare && explorer}
                dark={dark}
              />
            ) : (
              <div className="loading">
                {loadError || 'Finding the shape of today…'}
                {loadError && <button onClick={() => setRetry((r) => r + 1)}>Retry</button>}
              </div>
            )}
            <div className="drawing-caption">
              <span className="circle-symbol">◌</span>
              <strong>
                {geometry
                  ? explorer
                    ? exploreCount
                    : done
                      ? geometry.stages[5]
                      : geometry.stages[drawingStage]
                  : '—'}
              </strong>{' '}
              rotating circles{' '}
              {geometry && (done || drawingStage === 5) && geometry.exactFallback && (
                <small>· exact source outline</small>
              )}
            </div>
          </div>
          <div className="instrument-bar">
            <button
              className="text-control"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? 'Resume animation' : 'Pause animation'}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              className={`text-control ${circles ? 'enabled' : ''}`}
              onClick={() => setCircles(!circles)}
              aria-pressed={circles}
            >
              <Orbit size={16} />
              <span>Circles</span>
            </button>
            <button
              className="text-control speed"
              onClick={() => setSpeed((s) => (s === 0.5 ? 1 : s === 1 ? 2 : 0.5))}
              aria-label={`Animation speed ${speed} times`}
            >
              {speed}× <span>speed</span>
            </button>
            <span className="instrument-note">A LITTLE FOURIER MAGIC</span>
          </div>
        </section>
        <section className="play-section">
          {!done ? (
            <>
              <div className="guess-heading">
                <h2>Which country is taking shape?</h2>
                <span>
                  {6 - game.guesses.length} {game.guesses.length === 5 ? 'guess' : 'guesses'} left
                </span>
              </div>
              {game.difficulty === 'easy' && game.guesses.length >= 3 && geometry && (
                <p className="easy-clue">
                  Continent:{' '}
                  <strong>{countries.find((c) => c.id === game.answer)?.continent}</strong>
                  {game.guesses.length >= 5 && (
                    <>
                      {' '}
                      · First letter: <strong>{geometry.name.charAt(0)}</strong>
                    </>
                  )}
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(open && query && options.length ? options[active]?.id : undefined);
                }}
                className="guess-form"
              >
                <div className="input-wrap">
                  <Globe2 size={19} className="input-globe" />
                  <label className="sr-only" htmlFor="country">
                    Search for a country
                  </label>
                  <input
                    id="country"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={open && !!options.length}
                    aria-controls="country-options"
                    aria-activedescendant={
                      open && options[active] ? `option-${options[active].id}` : undefined
                    }
                    autoComplete="off"
                    placeholder="Search for a country…"
                    value={query}
                    disabled={!geometry}
                    onFocus={() => query && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setOpen(true);
                      setActive(0);
                      setMessage('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setOpen(true);
                        setActive((a) => Math.min(a + 1, options.length - 1));
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((a) => Math.max(a - 1, 0));
                      }
                      if (e.key === 'Escape') setOpen(false);
                    }}
                  />
                  <ChevronDown size={16} />
                  {open && query && (
                    <ul id="country-options" role="listbox">
                      {options.length ? (
                        options.map((c, i) => (
                          <li
                            role="option"
                            aria-selected={active === i}
                            id={`option-${c.id}`}
                            key={c.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => {
                              setQuery(c.name);
                              setOpen(false);
                            }}
                          >
                            {c.name}
                            <ArrowUpRight size={14} />
                          </li>
                        ))
                      ) : (
                        <li className="empty-option">No unguessed country matches.</li>
                      )}
                    </ul>
                  )}
                </div>
                <button
                  className="submit-button"
                  disabled={!geometry || !query.trim()}
                  type="submit"
                >
                  Guess <ArrowRight size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="result">
              <div className="eyebrow">
                {game.status === 'won' ? 'A BEAUTIFUL DISCOVERY' : 'THE WORLD IS FULL OF SURPRISES'}
              </div>
              <h2>
                {game.status === 'won'
                  ? 'Nicely drawn. Nicely done.'
                  : 'A new shape, a new discovery.'}
              </h2>
              <p>
                {game.status === 'won'
                  ? `You identified ${geometry?.name || 'the country'} in ${game.guesses.length} ${game.guesses.length === 1 ? 'guess' : 'guesses'}.`
                  : `The country was ${geometry?.name || '…'}.`}
              </p>
              {geometry?.note && <p className="geography-note">{geometry.note}</p>}
              <div className="result-actions">
                {mode === 'daily' ? (
                  <button className="primary" onClick={share}>
                    <Share2 size={16} /> Share result
                  </button>
                ) : (
                  <button className="primary" onClick={freshPractice}>
                    <RotateCcw size={16} /> Another country
                  </button>
                )}
                <button
                  className="secondary"
                  onClick={() => {
                    setExplorer(!explorer);
                    setExploreCount(32);
                  }}
                >
                  <SlidersHorizontal size={16} />
                  {explorer ? 'Close explorer' : 'Explore the circles'}
                </button>
              </div>
              <p className="result-meta">
                {mode === 'daily'
                  ? `${dailyStats.streak} day streak · Next puzzle in ${countdown(now)}`
                  : `This session: ${practiceScores.wins} wins · ${practiceScores.losses} losses`}
              </p>
            </div>
          )}
          <p className="status-message" role="status" aria-live="polite">
            {message || (!done ? 'Every wrong guess adds a little more detail.' : '')}
          </p>
          <div className="guess-history" aria-label="Your guesses">
            {Array.from({ length: 6 }, (_, i) => {
              const id = game.guesses[i];
              const correct = id === game.answer;
              return (
                <div
                  key={i}
                  className={`guess-slot ${id ? 'used' : ''} ${correct ? 'correct' : ''} ${!done && i === stage ? 'current' : ''}`}
                >
                  <span className="slot-number">{String(i + 1).padStart(2, '0')}</span>
                  {id ? (
                    <>
                      <span>{countries.find((c) => c.id === id)?.name || id}</span>
                      {correct ? (
                        <Check size={14} aria-label="Correct" />
                      ) : (
                        <X size={14} aria-label="Incorrect" />
                      )}
                    </>
                  ) : (
                    <span className="slot-dash">—</span>
                  )}
                </div>
              );
            })}
          </div>
          {storageError && (
            <p role="alert" className="warning">
              Your browser could not save progress. Keep this page open to finish this game.
            </p>
          )}
          {mode === 'practice' && !done && (
            <button className="practice-next" onClick={freshPractice}>
              Skip to a new practice country <ArrowRight size={14} />
            </button>
          )}
        </section>
        {explorer && done && geometry && (
          <section className="explorer">
            <div className="eyebrow">BEHIND THE OUTLINE</div>
            <h2>A country, written in circles.</h2>
            <label htmlFor="coefficient-range">
              Rotating circles <strong>{exploreCount}</strong>
            </label>
            <input
              id="coefficient-range"
              type="range"
              min="1"
              max={geometry.terms.length}
              value={exploreCount}
              onChange={(e) => setExploreCount(+e.target.value)}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
              />{' '}
              Compare with the geographical outline
            </label>
            <div className="formula">
              z<sub>N</sub>(t) = ∑<sub>n ∈ Sₙ</sub> cₙ e<sup>int</sup>
            </div>
            <p>
              Each circle is a rotating arrow. Its size comes from <em>cₙ</em>, and its speed and
              direction come from <em>n</em>. Add the arrows tip to tail, and the final point traces
              a country. More circles bring back finer details.
            </p>
            <p className="muted">
              Counts include all independent island chains. Stationary centers aren’t circles.
              Dashed gold lines show the source outline; the green line is always the selected
              Fourier reconstruction in this explorer.
            </p>
          </section>
        )}
        <div className="how-strip">
          <span className="mini-orbits">◎</span>
          <p>
            A few circles. A familiar outline.
            <br />
            <strong>How much of the world do you recognize?</strong>
          </p>
          <button onClick={() => setModal('help')} aria-label="Learn how to play">
            <ArrowUpRight size={21} />
          </button>
        </div>
      </main>
      <footer>
        <span>MADE OF CIRCLES. INSPIRED BY THE WORLD.</span>
        <div>
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>
          <span>·</span>
          <button onClick={() => setModal('help')}>About the game</button>
          <span>·</span>
          <a href="/privacy.html">Privacy</a>
          <span>·</span>
          <a href="/accessibility.html">Accessibility</a>
          <span>·</span>
          <a href="/credits.html">Credits</a>
          <span>·</span>
          <span>Next puzzle {countdown(now)} · UTC</span>
        </div>
      </footer>
      {modal === 'help' && (
        <Dialog title="One circle at a time." close={() => setModal(null)}>
          <p>A mystery country. Six guesses. An outline that gets clearer with every try.</p>
          <p>
            Choose <strong>Easy</strong> to start with four circles. It reveals the continent on
            guess 4 and the first letter on guess 6. <strong>Hard</strong> keeps the original
            circle-by-circle challenge. You can change difficulty while a puzzle is in progress;
            your shared result notes if Easy was used.
          </p>
          <ol className="instructions">
            <li>
              <strong>Look at the shape.</strong> Rotating circles draw a simplified country
              outline. North is always up.
            </li>
            <li>
              <strong>Make your guess.</strong> Search for a country and submit it.
            </li>
            <li>
              <strong>Watch the details emerge.</strong> Each wrong guess adds circles. The sixth
              guess gets the most accurate outline.
            </li>
          </ol>
          <p>
            Everyone gets the same daily puzzle, resetting at midnight UTC. Practice as much as you
            like without affecting your daily streak.
          </p>
          <div className="info-note">
            Some countries use their main geographical region, such as the contiguous United States
            and metropolitan France. Small offshore islands may be omitted. Independent islands are
            never connected by artificial lines.
          </div>
          <h3>Real geography. Real mathematics.</h3>
          <p>
            These are genuine Fourier series of public-domain Natural Earth boundaries. The complete
            current approximation is always visible, so you can guess at your own pace.
          </p>
          <button className="primary full" onClick={() => setModal(null)}>
            Let’s find a country <ArrowRight size={16} />
          </button>
        </Dialog>
      )}
      {modal === 'settings' && (
        <Dialog title="Make yourself at home." close={() => setModal(null)}>
          <div className="setting-row">
            <span>{dark ? <Moon size={18} /> : <Sun size={18} />} Dark appearance</span>
            <button className="secondary" aria-pressed={dark} onClick={() => setDark(!dark)}>
              {dark ? 'On' : 'Off'}
            </button>
          </div>
          <div className="setting-row">
            <span>Animation</span>
            <button className="secondary" onClick={() => setPaused(!paused)}>
              {paused ? 'Paused' : 'Playing'}
            </button>
          </div>
          <div className="setting-row">
            <label htmlFor="speed-select">Drawing speed</label>
            <select id="speed-select" value={speed} onChange={(e) => setSpeed(+e.target.value)}>
              <option value="0.5">Slow · 0.5×</option>
              <option value="1">Relaxed · 1×</option>
              <option value="2">Brisk · 2×</option>
            </select>
          </div>
          <p className="muted">
            Reduced-motion preferences pause the drawing automatically on your first visit. Progress
            and statistics stay in this browser. No account, no tracking, no server storage.
          </p>
        </Dialog>
      )}
      {modal === 'stats' && (
        <Dialog title="Your little world tour." close={() => setModal(null)}>
          <div className="stats-grid">
            {[
              [dailyStats.played, 'Played'],
              [dailyStats.percent + '%', 'Win rate'],
              [dailyStats.streak, 'Streak'],
              [dailyStats.max, 'Best streak'],
            ].map(([v, l]) => (
              <div key={l}>
                <strong>{v}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <h3>Guess distribution</h3>
          <div className="distribution">
            {dailyStats.distribution.map((n, i) => (
              <div key={i}>
                <span>{i + 1}</span>
                <div
                  style={{
                    width: `${Math.max(6, (n / Math.max(1, ...dailyStats.distribution)) * 90)}%`,
                  }}
                >
                  {n}
                </div>
              </div>
            ))}
          </div>
          <h3>Recent daily puzzles</h3>
          <div className="history-list">
            {dailyStats.completed.length ? (
              dailyStats.completed
                .slice(-10)
                .reverse()
                .map((g) => (
                  <div key={g.day}>
                    <span>
                      #{g.day + 1} · {countries.find((c) => c.id === g.answer)?.name}
                    </span>
                    <strong>
                      {g.status === 'won' ? `${g.guesses.length}/6` : 'X/6'} ·{' '}
                      {g.assisted ? 'Easy' : 'Hard'}
                    </strong>
                  </div>
                ))
            ) : (
              <p>Your first adventure starts here.</p>
            )}
          </div>
          {done && mode === 'daily' && (
            <>
              <button className="primary full" onClick={share}>
                <Copy size={16} /> Share today’s result
              </button>
              <textarea
                aria-label="Spoiler-free result to copy"
                className="share-copy"
                readOnly
                value={shareText(game, location.origin)}
              />
            </>
          )}
          <p className="muted">Daily games only. Practice keeps its own session score.</p>
        </Dialog>
      )}
    </div>
  );
}

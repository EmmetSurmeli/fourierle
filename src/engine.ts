import pool from './pool.json' with { type: 'json' };
export const EPOCH = Date.UTC(2026, 0, 1);
export const DAY = 86400000;
export const VERSION = 'v1';
export type Country = { id: string; name: string; aliases: string[] };
export type Term = [number, number, number, number];
export type Geometry = {
  id: string;
  name: string;
  chains: { center: [number, number]; exact: [number, number][] }[];
  terms: Term[];
  stages: number[];
  exactFallback: boolean;
  note: string;
  coverage: number;
};
export type Game = {
  day: number;
  answer: string;
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
};
export type Archive = { version: 1; days: Record<string, Game> };
export const utcDay = (now = Date.now()) => Math.floor((now - EPOCH) / DAY);
// Frozen v1 pool + seeded Fisher-Yates. Repeating this cycle guarantees gaps of pool.length > 100.
export function schedule(ids: readonly string[] = pool) {
  let state = 0x464f5552;
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const order = schedule();
export const dailyCountry = (day = utcDay()) =>
  order[((day % order.length) + order.length) % order.length];
export const newGame = (day: number, answer = dailyCountry(day)): Game => ({
  day,
  answer,
  guesses: [],
  status: 'playing',
});
export function guess(game: Game, id: string): Game {
  if (
    game.status !== 'playing' ||
    game.guesses.length >= 6 ||
    !pool.includes(id) ||
    game.guesses.includes(id)
  )
    return game;
  const guesses = [...game.guesses, id];
  return {
    ...game,
    guesses,
    status: id === game.answer ? 'won' : guesses.length === 6 ? 'lost' : 'playing',
  };
}
export function loadArchive(raw: string | null): Archive {
  const safe: Archive = { version: 1, days: {} };
  try {
    const input = JSON.parse(raw || 'null');
    if (input?.version !== 1 || typeof input.days !== 'object') return safe;
    for (const [key, value] of Object.entries(input.days).slice(-10000)) {
      const g = value as Game;
      const day = Number(key);
      if (
        !Number.isInteger(day) ||
        g?.day !== day ||
        g.answer !== dailyCountry(day) ||
        !Array.isArray(g.guesses) ||
        g.guesses.length > 6 ||
        new Set(g.guesses).size !== g.guesses.length ||
        !g.guesses.every((x) => pool.includes(x))
      )
        continue;
      let valid = newGame(day);
      for (const id of g.guesses) valid = guess(valid, id);
      if (valid.guesses.length === g.guesses.length) safe.days[key] = valid;
    }
  } catch {
    /* Malformed browser storage must not prevent play. */
  }
  return safe;
}
export function stats(archive: Archive, today = utcDay()) {
  const completed = Object.values(archive.days)
    .filter((g) => g.status !== 'playing')
    .sort((a, b) => a.day - b.day);
  const wins = completed.filter((g) => g.status === 'won');
  const distribution = Array(6).fill(0);
  wins.forEach((g) => distribution[g.guesses.length - 1]++);
  let max = 0,
    run = 0,
    last = -Infinity;
  for (const g of completed) {
    run = g.status === 'won' ? (g.day === last + 1 ? run + 1 : 1) : 0;
    max = Math.max(max, run);
    last = g.day;
  }
  let cursor = archive.days[today]?.status === 'won' ? today : today - 1;
  let streak = 0;
  if (archive.days[today]?.status !== 'lost')
    while (archive.days[cursor]?.status === 'won') {
      streak++;
      cursor--;
    }
  return {
    played: completed.length,
    wins: wins.length,
    percent: completed.length ? Math.round((wins.length / completed.length) * 100) : 0,
    streak,
    max,
    distribution,
    completed,
  };
}
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export const matches = (c: Country, q: string) =>
  [c.name, ...c.aliases].some((x) => normalize(x).includes(normalize(q)));
export function point(center: [number, number], terms: Term[], t: number): [number, number] {
  let [x, y] = center;
  for (const [, freq, re, im] of terms) {
    const a = freq * t;
    x += re * Math.cos(a) - im * Math.sin(a);
    y += re * Math.sin(a) + im * Math.cos(a);
  }
  return [x, y];
}
export function shareText(game: Game, origin: string) {
  return `Fourierle #${game.day + 1} 🌍\n\n${Array.from({ length: 6 }, (_, i) => (i < game.guesses.length ? (game.guesses[i] === game.answer ? '🟩' : '⬜') : '⬛')).join(' ')}\n\n${game.status === 'won' ? `Solved in ${game.guesses.length}/6!` : 'See you tomorrow.  X/6'}\n\n${origin}`;
}

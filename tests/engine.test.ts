import { describe, it, expect } from 'vitest';
import {
  dailyCountry,
  utcDay,
  DAY,
  EPOCH,
  order,
  schedule,
  newGame,
  guess,
  loadArchive,
  stats,
  point,
  matches,
  shareText,
  setDifficulty,
  visibleStage,
} from '../src/engine';
describe('versioned UTC schedule', () => {
  it('is deterministic and contains more than 100 unique countries', () => {
    expect(schedule()).toEqual(order);
    expect(new Set(order).size).toBe(189);
  });
  it('has no repeats in any rolling 100 days over 100 years and cycle seams', () => {
    for (let i = 0; i < 36525; i++)
      expect(new Set(Array.from({ length: 100 }, (_, j) => dailyCountry(i + j))).size).toBe(100);
  });
  it('uses UTC at midnight, leap days and year boundaries', () => {
    expect(utcDay(Date.parse('2026-01-01T00:00:00Z'))).toBe(0);
    expect(utcDay(EPOCH - 1)).toBe(-1);
    expect(utcDay(EPOCH + DAY - 1)).toBe(0);
    expect(utcDay(EPOCH + DAY)).toBe(1);
    expect(utcDay(Date.parse('2028-03-01T00:00Z')) - utcDay(Date.parse('2028-02-28T00:00Z'))).toBe(
      2,
    );
    expect(utcDay(Date.parse('2027-01-01T00:00Z'))).toBe(365);
  });
  it('freezes published schedule examples', () => {
    expect(order.slice(0, 5)).toMatchSnapshot();
  });
});
describe('game transitions and persistence', () => {
  it('wins on the first guess and ignores subsequent submissions', () => {
    const g = guess(newGame(0, 'ITA'), 'ITA');
    expect(g.status).toBe('won');
    expect(guess(g, 'FRA')).toBe(g);
  });
  it('rejects unknown and duplicate countries, ends after exactly six wrong guesses', () => {
    let g = newGame(0, 'ITA');
    expect(guess(g, 'Atlantis')).toBe(g);
    g = guess(g, 'FRA');
    expect(g.guesses).toHaveLength(1);
    expect(guess(g, 'FRA')).toBe(g);
    for (const id of ['USA', 'GBR', 'DEU', 'ESP', 'JPN']) g = guess(g, id);
    expect(g.status).toBe('lost');
    expect(guess(g, 'ITA')).toBe(g);
  });
  it('restores progress and derives outcomes, rejects corrupt schemas and invalid history', () => {
    let g = newGame(1);
    g = guess(g, g.answer);
    const data = { version: 1, days: { 1: g } };
    expect(loadArchive(JSON.stringify(data)).days[1]).toEqual(g);
    expect(loadArchive('broken').days).toEqual({});
    expect(loadArchive(JSON.stringify({ version: 9, days: { 1: g } })).days).toEqual({});
    expect(
      loadArchive(JSON.stringify({ version: 1, days: { 1: { ...g, answer: 'ZZZ' } } })).days,
    ).toEqual({});
  });
  it('counts games exactly once and handles missed days, losses and incomplete today', () => {
    const win = (d: number) => guess(newGame(d), dailyCountry(d));
    const a = { version: 1 as const, days: { 0: win(0), 1: win(1), 3: win(3), 4: newGame(4) } };
    expect(stats(a, 4)).toMatchObject({ played: 3, wins: 3, streak: 1, max: 2 });
    expect(stats(a, 5).streak).toBe(0);
    expect(stats(loadArchive(JSON.stringify(a)), 4).played).toBe(3);
  });
  it('supports aliases and accent-insensitive search', () => {
    expect(matches({ id: 'TUR', name: 'Türkiye', aliases: ['Turkey'] }, 'turk')).toBe(true);
  });
  it('shares spoiler-free results using the deployed origin', () => {
    const g = guess(guess(newGame(0, 'ITA'), 'FRA'), 'ITA');
    const s = shareText(g, 'https://example.test');
    expect(s).toContain('⬜ 🟩 ⬛');
    expect(s).not.toContain('Italy');
    expect(s).toContain('https://example.test');
  });
  it('keeps six guesses while easy mode advances the outline and labels assisted shares', () => {
    const hard = newGame(0);
    expect(visibleStage(hard)).toBe(0);
    const easy = setDifficulty(hard, 'easy');
    expect(visibleStage(easy)).toBe(2);
    const threeMisses = order
      .filter((id) => id !== hard.answer)
      .slice(0, 3)
      .reduce(guess, easy);
    expect(visibleStage(threeMisses)).toBe(5);
    expect(threeMisses.status).toBe('playing');
    const backToHard = setDifficulty(threeMisses, 'hard');
    expect(backToHard.assisted).toBe(true);
    expect(shareText(backToHard, 'https://example.test')).toContain('Easy');
    const restored = loadArchive(JSON.stringify({ version: 1, days: { 0: backToHard } }));
    expect(restored.days[0].assisted).toBe(true);
    expect(restored.days[0].difficulty).toBe('hard');
  });
});
describe('complex Fourier engine', () => {
  it('rotates positive and negative frequencies oppositely', () => {
    expect(point([0, 0], [[0, 1, 1, 0]], Math.PI / 2)[1]).toBeCloseTo(1);
    expect(point([0, 0], [[0, -1, 1, 0]], Math.PI / 2)[1]).toBeCloseTo(-1);
  });
  it('sums epicycle endpoints with a stationary translation', () => {
    const p = point(
      [2, 3],
      [
        [0, 1, 1, 0],
        [0, -2, 0, 2],
      ],
      0,
    );
    expect(p).toEqual([3, 5]);
  });
});

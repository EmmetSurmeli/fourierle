import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import App from '../src/App';
import { dailyCountry } from '../src/engine';
vi.mock('../src/Canvas', () => ({ FourierCanvas: () => <div data-testid="canvas" /> }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
it('plays a daily game through accessible controls and preserves it on remount', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const id = dailyCountry();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('countries')
          ? [{ id, name: 'Test country', aliases: [] }]
          : {
              id,
              name: 'Test country',
              chains: [],
              terms: [],
              stages: [2, 4, 8, 16, 32, 64],
              exactFallback: false,
              note: '',
            },
    })),
  );
  const { unmount } = render(<App />);
  await screen.findByTestId('canvas');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Test country' } });
  fireEvent.click(screen.getByRole('button', { name: /^Guess$/ }));
  await screen.findByText('Nicely drawn. Nicely done.');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  unmount();
  render(<App />);
  await waitFor(() => expect(screen.getByText('Nicely drawn. Nicely done.')).toBeInTheDocument());
});

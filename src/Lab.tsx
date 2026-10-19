import { useEffect, useState } from 'react';
import { FourierCanvas } from './Canvas';
import { Country, Geometry } from './engine';
export default function Lab() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [id, setId] = useState('ITA');
  const [g, setG] = useState<Geometry>();
  const [report, setReport] = useState<any[]>([]);
  useEffect(() => {
    fetch('/data/countries.json')
      .then((r) => r.json())
      .then(setCountries);
    fetch('/data/calibration.json')
      .then((r) => r.json())
      .then(setReport);
  }, []);
  useEffect(() => {
    fetch(`/data/${id}.json`)
      .then((r) => r.json())
      .then(setG);
  }, [id]);
  const entry = report.find((r) => r.id === id);
  return (
    <main className="lab">
      <div className="eyebrow">DEVELOPMENT ONLY · CALIBRATION LAB</div>
      <h1>Six ways to see a country.</h1>
      <p>
        Review every stage. Use scripts/overrides.json for persistent country-specific budgets.
        Metrics measure geometry, not human recognition.
      </p>
      <label>
        Country{' '}
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {countries.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="lab-grid" data-country={g?.id ?? ''}>
        {g?.stages.map((n, i) => (
          <article key={i}>
            <h3>
              Attempt {i + 1} · {n} circles
            </h3>
            <FourierCanvas
              geometry={g}
              count={n}
              paused
              circles={false}
              speed={1}
              exact={i === 5 && g.exactFallback}
              small
            />
            <p>
              Fourier fidelity: {((entry?.levels[i].fidelity || 0) * 100).toFixed(3)}%
              {i === 5 && g.exactFallback ? ' · exact display fallback' : ''}
            </p>
          </article>
        ))}
      </div>
      <pre>{JSON.stringify(entry, null, 2)}</pre>
      <a href="/">Return to game</a>
    </main>
  );
}

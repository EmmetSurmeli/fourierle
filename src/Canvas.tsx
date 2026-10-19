import { useEffect, useRef } from 'react';
import { Geometry, point } from './engine';
type Props = {
  geometry: Geometry;
  count: number;
  paused: boolean;
  circles: boolean;
  speed: number;
  exact?: boolean;
  compare?: boolean;
  dark?: boolean;
  small?: boolean;
};
export function FourierCanvas({
  geometry,
  count,
  paused,
  circles,
  speed,
  exact = false,
  compare = false,
  dark = false,
  small = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(1.3);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let frame = 0,
      last = 0;
    let width = 0,
      height = 0;
    let started = performance.now();
    const groups = geometry.chains.map((chain, i) => ({
      chain,
      terms: geometry.terms.slice(0, count).filter((t) => t[0] === i),
    }));
    const paths = groups.map(({ chain, terms }) => {
      const p = new Path2D();
      for (let k = 0; k <= 512; k++) {
        const [x, y] = point(chain.center, terms, (k / 512) * Math.PI * 2);
        if (k === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      return p;
    });
    const exactPaths = geometry.chains.map((chain) => {
      const p = new Path2D();
      chain.exact.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
      return p;
    });
    // The fixed country coordinate system prevents zooming between guesses; leave room for epicycles.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const draw = (now: number) => {
      if (!document.hidden) {
        if (last && !paused) phase.current += (Math.min(now - last, 50) / 1000) * 0.5 * speed;
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        const scale = Math.min(width, height) * (small ? 0.72 : 0.64);
        ctx.scale(scale, scale);
        const green = dark ? '#a0d8b8' : '#205e4a';
        const soft = dark ? '#8ea69a' : '#8f9d91';
        if (compare) {
          ctx.strokeStyle = dark ? '#bb9d67' : '#ab8247';
          ctx.lineWidth = 1 / scale;
          ctx.setLineDash([4 / scale, 5 / scale]);
          exactPaths.forEach((p) => ctx.stroke(p));
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = paused ? 1 : Math.min(1, 0.45 + (now - started) / 650);
        ctx.strokeStyle = green;
        ctx.lineWidth = (small ? 1.6 : 2.3) / scale;
        ctx.lineJoin = 'round';
        (exact ? exactPaths : paths).forEach((p, i) => {
          if (exact || groups[i].terms.length) ctx.stroke(p);
        });
        ctx.globalAlpha = 1;
        if (circles) {
          groups.forEach(({ chain, terms }) => {
            if (!terms.length) return;
            let [x, y] = chain.center;
            terms.forEach(([, f, re, im]) => {
              const r = Math.hypot(re, im);
              const a = f * phase.current;
              const nx = x + re * Math.cos(a) - im * Math.sin(a),
                ny = y + re * Math.sin(a) + im * Math.cos(a);
              ctx.strokeStyle = soft;
              ctx.globalAlpha = 0.45;
              ctx.lineWidth = 0.8 / scale;
              if (r * scale > 1.2) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.stroke();
              }
              ctx.globalAlpha = 0.65;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(nx, ny);
              ctx.stroke();
              x = nx;
              y = ny;
            });
            ctx.globalAlpha = 1;
            ctx.fillStyle = green;
            ctx.shadowColor = green;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y, (small ? 2 : 3.8) / scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        }
        if (!exact && !small) {
          groups.forEach(({ chain, terms }) => {
            if (!terms.length) return;
            ctx.strokeStyle = green;
            ctx.lineWidth = 3 / scale;
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            for (let k = 0; k < 50; k++) {
              const [x, y] = point(chain.center, terms, phase.current - k * 0.006);
              k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
          });
        }
        ctx.restore();
      }
      last = now;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [geometry, count, paused, circles, speed, exact, compare, dark, small]);
  return (
    <canvas
      ref={ref}
      className={small ? 'mini-canvas' : 'fourier-canvas'}
      role="img"
      aria-label="Country outline reconstructed from rotating Fourier circles. Identify its shape using the country selector below."
    />
  );
}

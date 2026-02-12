import { adaptParamsToSolver, computeResponseSafe } from "./resonate_solver_fit.js";

function sampleSeriesAtFreqs(series: any[], freqs: number[]) {
  if (!Array.isArray(series) || !series.length) return null;
  const out: number[] = [];
  let j = 0;
  for (let i = 0; i < freqs.length; i += 1) {
    const f = freqs[i];
    while (j + 1 < series.length && series[j + 1].x < f) j += 1;
    const a = series[j];
    const b = series[Math.min(j + 1, series.length - 1)];
    if (!Number.isFinite(a?.x) || !Number.isFinite(a?.y)) {
      out.push(Number.isFinite(b?.y) ? b.y : 0);
      continue;
    }
    if (!Number.isFinite(b?.x) || !Number.isFinite(b?.y) || a.x === b.x) {
      out.push(a.y);
      continue;
    }
    const t = (f - a.x) / (b.x - a.x);
    out.push(a.y + t * (b.y - a.y));
  }
  return out;
}

export function responseOverlayFromSolver(rawParams: Record<string, number | boolean | undefined>, freqs: number[]): number[] | null {
  const resp = computeResponseSafe(adaptParamsToSolver(rawParams));
  if (!resp?.total?.length) return null;
  return sampleSeriesAtFreqs(resp.total, freqs);
}

export function buildOverlayFromModes(freqs: number[], dbs: number[], modes: { mode: string; peakFreq: number | null }[]) {
  const baseline = Math.min(...dbs, -90);
  const overlay = freqs.map(() => baseline);
  modes.forEach((m) => {
    if (!Number.isFinite(m.peakFreq)) return;
    const f0 = m.peakFreq as number;
    const width = Math.max(6, f0 * 0.06);
    let peakDb = baseline;
    let bestIdx = 0;
    freqs.forEach((f, idx) => {
      const d = Math.abs(f - f0);
      if (d < Math.abs(freqs[bestIdx] - f0)) bestIdx = idx;
    });
    peakDb = dbs[bestIdx] ?? baseline;
    overlay.forEach((_, i) => {
      const d = Math.abs(freqs[i] - f0);
      const val = peakDb - ((d / width) ** 2) * 8;
      if (val > overlay[i]) overlay[i] = val;
    });
  });
  return overlay;
}

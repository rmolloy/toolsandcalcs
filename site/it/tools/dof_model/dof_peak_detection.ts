export type DofModeKey = "air" | "top" | "back";

export type DofSeriesPoint = {
  x: number;
  y: number;
};

export type DofLocalPeak = {
  idx: number;
  freq: number;
  db: number;
  prominence: number;
};

export const DOF_MODE_BANDS: Record<DofModeKey, { low: number; high: number }> = {
  air: { low: 75, high: 115 },
  top: { low: 150, high: 205 },
  back: { low: 210, high: 260 },
};

export function peakFreqInBand(
  series: DofSeriesPoint[],
  band: { low: number; high: number },
) {
  let bestX: number | null = null;
  let bestY = -Infinity;
  for (let i = 0; i < series.length; i += 1) {
    const point = series[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < band.low || point.x > band.high) continue;
    if (point.y > bestY) {
      bestY = point.y;
      bestX = point.x;
    }
  }
  return bestX;
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function refineParabolicPeak(xs: number[], ys: number[], idx: number) {
  if (idx <= 0 || idx >= ys.length - 1) return null;
  const a = ys[idx - 1];
  const b = ys[idx];
  const c = ys[idx + 1];
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
  const bw = xs.length > 1 ? Math.abs(xs[1] - xs[0]) : null;
  if (!bw || !Number.isFinite(bw) || bw <= 0) return null;
  const denom = a - (2 * b) + c;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
  const delta = 0.5 * (a - c) / denom;
  if (!Number.isFinite(delta)) return null;
  const clamped = Math.max(-1, Math.min(1, delta));
  const freq = xs[idx] + clamped * bw;
  const y = b - ((a - c) * clamped) / 4;
  return { freq, y, delta: clamped };
}

export function collectLocalPeaks(
  series: DofSeriesPoint[],
  band?: { low: number; high: number },
) {
  if (!Array.isArray(series) || series.length < 3) return [];
  const xs = series.map((point) => point?.x);
  const ys = series.map((point) => point?.y);
  const peaks: DofLocalPeak[] = [];
  for (let i = 1; i < series.length - 1; i += 1) {
    const y = ys[i];
    const yPrevious = ys[i - 1];
    const yNext = ys[i + 1];
    if (!Number.isFinite(y) || !Number.isFinite(yPrevious) || !Number.isFinite(yNext)) continue;
    if (!(y > yPrevious && y > yNext)) continue;
    const x = xs[i];
    if (!Number.isFinite(x)) continue;
    if (band && ((x as number) < band.low || (x as number) > band.high)) continue;
    const start = Math.max(0, i - 6);
    const end = Math.min(ys.length - 1, i + 6);
    const neighbors: number[] = [];
    for (let j = start; j <= end; j += 1) {
      if (j === i) continue;
      const value = ys[j];
      if (Number.isFinite(value)) neighbors.push(value as number);
    }
    const baseline = neighbors.length ? median(neighbors) : (y as number);
    const prominence = (y as number) - baseline;
    const refined = refineParabolicPeak(xs as number[], ys as number[], i);
    peaks.push({
      idx: i,
      freq: refined?.freq ?? (x as number),
      db: refined?.y ?? (y as number),
      prominence,
    });
  }
  return peaks;
}

export function pickDominantPeak(
  series: DofSeriesPoint[],
  band: { low: number; high: number },
) {
  const peaks = collectLocalPeaks(series, band);
  if (!peaks.length) return null;
  peaks.sort((a, b) => b.prominence - a.prominence);
  return peaks[0];
}

export function assignPeaksToModes(
  totalPeaks: DofLocalPeak[],
  targets: Record<DofModeKey, number | null>,
) {
  const modes: DofModeKey[] = ["air", "top", "back"];
  const assigned: Record<DofModeKey, number | null> = { air: null, top: null, back: null };
  if (!totalPeaks.length) return assigned;

  if (totalPeaks.length >= modes.length) {
    const permutations: number[][] = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    let best = permutations[0];
    let bestCost = Infinity;
    permutations.forEach((permutation) => {
      let cost = 0;
      modes.forEach((mode, index) => {
        const target = targets[mode];
        const peak = totalPeaks[permutation[index]];
        if (!Number.isFinite(target)) {
          cost += 1e6;
          return;
        }
        cost += Math.abs(peak.freq - (target as number));
      });
      if (cost < bestCost) {
        bestCost = cost;
        best = permutation;
      }
    });
    modes.forEach((mode, index) => {
      assigned[mode] = totalPeaks[best[index]]?.freq ?? null;
    });
    return assigned;
  }

  const remaining = totalPeaks.slice();
  modes.forEach((mode) => {
    if (!remaining.length) return;
    const target = targets[mode];
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const distance = Number.isFinite(target)
        ? Math.abs(remaining[i].freq - (target as number))
        : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const chosen = remaining.splice(bestIndex, 1)[0];
    assigned[mode] = chosen?.freq ?? null;
  });
  return assigned;
}

export function modelPeaksFromResponse(response: any) {
  const total = response?.total;
  if (!Array.isArray(total) || !total.length) return null;
  const totalPeaks = collectLocalPeaks(total)
    .sort((a, b) => b.prominence - a.prominence)
    .slice(0, 3);
  if (!totalPeaks.length) {
    return {
      air: peakFreqInBand(total, DOF_MODE_BANDS.air),
      top: peakFreqInBand(total, DOF_MODE_BANDS.top),
      back: peakFreqInBand(total, DOF_MODE_BANDS.back),
    };
  }
  const bandCenter = (mode: DofModeKey) =>
    (DOF_MODE_BANDS[mode].low + DOF_MODE_BANDS[mode].high) / 2;
  const componentPeaks = {
    air: pickDominantPeak(response?.air || [], DOF_MODE_BANDS.air),
    top: pickDominantPeak(response?.top || [], DOF_MODE_BANDS.top),
    back: pickDominantPeak(response?.back || [], DOF_MODE_BANDS.back),
  };
  const targets = {
    air: componentPeaks.air?.freq ?? bandCenter("air"),
    top: componentPeaks.top?.freq ?? bandCenter("top"),
    back: componentPeaks.back?.freq ?? bandCenter("back"),
  };
  return assignPeaksToModes(totalPeaks, targets);
}

export type SeriesPoint = { x: number; y: number };

export function seriesValueSampleAtFrequency(
  series: SeriesPoint[],
  frequency: number | null,
): number | null {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(frequency)) return null;
  let index = 0;
  while (index + 1 < series.length && series[index + 1].x < (frequency as number)) {
    index += 1;
  }
  const left = series[index];
  const right = series[Math.min(index + 1, series.length - 1)];
  if (!Number.isFinite(left?.x) || !Number.isFinite(left?.y)) {
    return Number.isFinite(right?.y) ? right.y : null;
  }
  if (!Number.isFinite(right?.x) || !Number.isFinite(right?.y) || left.x === right.x) {
    return left.y;
  }
  const ratio = ((frequency as number) - left.x) / (right.x - left.x);
  return left.y + ratio * (right.y - left.y);
}

export function seriesValuesSampleAtFrequencies(
  series: SeriesPoint[],
  frequencies: number[],
  fallback = 0,
): number[] | null {
  if (!Array.isArray(series) || !series.length) return null;
  return frequencies.map((frequency) => {
    const value = seriesValueSampleAtFrequency(series, frequency);
    return Number.isFinite(value) ? (value as number) : fallback;
  });
}

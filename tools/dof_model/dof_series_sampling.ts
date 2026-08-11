export type DofSeriesPoint = {
  x: number;
  y: number;
};

export function sampleDofSeriesAtFrequency(
  series: DofSeriesPoint[],
  frequency: number | null,
) {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(frequency)) {
    return null;
  }

  let lowerIndex = 0;
  while (
    lowerIndex + 1 < series.length
    && series[lowerIndex + 1].x < (frequency as number)
  ) {
    lowerIndex += 1;
  }

  const lower = series[lowerIndex];
  const upper = series[Math.min(lowerIndex + 1, series.length - 1)];
  if (!Number.isFinite(lower?.x) || !Number.isFinite(lower?.y)) {
    return Number.isFinite(upper?.y) ? upper.y : null;
  }
  if (
    !Number.isFinite(upper?.x)
    || !Number.isFinite(upper?.y)
    || lower.x === upper.x
  ) {
    return lower.y;
  }

  const fraction = ((frequency as number) - lower.x) / (upper.x - lower.x);
  return lower.y + fraction * (upper.y - lower.y);
}

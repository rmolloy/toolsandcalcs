export type QAggregation = "median" | "max" | "p75";

export const DEFAULT_Q_AGGREGATION: QAggregation = "p75";

const QUANTILES = { median: 0.5, max: 1, p75: 0.75 } as const;

export function aggregateDecayQ(values: Array<number | null>, aggregation: QAggregation = DEFAULT_Q_AGGREGATION): number | null {
  const accepted = values.filter(isPositiveFiniteQ).sort((left, right) => left - right);
  if (!accepted.length) return null;
  return interpolateSortedQ(accepted, (accepted.length - 1) * QUANTILES[aggregation]);
}

function isPositiveFiniteQ(value: number | null): value is number {
  return Number.isFinite(value) && Number(value) > 0;
}

function interpolateSortedQ(sorted: number[], position: number): number {
  const lower = sorted[Math.floor(position)];
  const upper = sorted[Math.ceil(position)];
  return lower + (upper - lower) * (position % 1);
}

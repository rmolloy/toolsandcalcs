export const DEFAULT_Q_AGGREGATION = "p75";
const QUANTILES = { median: 0.5, max: 1, p75: 0.75 };
export function aggregateDecayQ(values, aggregation = DEFAULT_Q_AGGREGATION) {
    const accepted = values.filter(isPositiveFiniteQ).sort((left, right) => left - right);
    if (!accepted.length)
        return null;
    return interpolateSortedQ(accepted, (accepted.length - 1) * QUANTILES[aggregation]);
}
function isPositiveFiniteQ(value) {
    return Number.isFinite(value) && Number(value) > 0;
}
function interpolateSortedQ(sorted, position) {
    const lower = sorted[Math.floor(position)];
    const upper = sorted[Math.ceil(position)];
    return lower + (upper - lower) * (position % 1);
}

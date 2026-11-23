// The part of a recording the Resonance Reader analyses when the luthier has not chosen one: the run of
// taps it found, or the start of the recording when it found none.
const TAP_CLUSTER_GAP_MS = 950;
export const TAP_CLUSTER_OUTLIER_MIN_RATIO = 0.6;
export const TAP_CLUSTER_OUTLIER_MAX_RATIO = 1.8;
const FALLBACK_WINDOW_MIN_MS = 900;
const FALLBACK_WINDOW_MAX_MS = 3000;
const FALLBACK_WINDOW_RATIO = 0.22;
export function primaryRangeAutoSelectFromState(slice, state) {
    if (state.viewRangeMs)
        return null;
    const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
    if (!taps.length)
        return fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
    const ranges = taps
        .map((tap) => ({
        start: (tap.start / slice.sampleRate) * 1000,
        end: (tap.end / slice.sampleRate) * 1000,
    }))
        .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);
    const bestCluster = contiguousRangeClusterBestBuild(ranges, TAP_CLUSTER_GAP_MS, { preferCount: true });
    if (ranges.length > 1 && bestCluster?.ranges?.length === 1)
        return isolatedTapRangeSpanBuild(ranges);
    const normalizedRange = rangeClusterNormalizeByMedianDuration(bestCluster);
    return normalizedRange || fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
}
export function isolatedTapRangeSpanBuild(ranges) {
    return { start: Math.min(...ranges.map((range) => range.start)), end: Math.max(...ranges.map((range) => range.end)) };
}
export function waveDurationMsResolve(state, slice) {
    const fromSlice = Number(slice?.timeMs?.[slice.timeMs.length - 1]);
    if (Number.isFinite(fromSlice) && fromSlice > 0)
        return fromSlice;
    const fromCurrentWave = Number(state?.currentWave?.fullLengthMs);
    if (Number.isFinite(fromCurrentWave) && fromCurrentWave > 0)
        return fromCurrentWave;
    const fromState = Number(state?.endMs);
    if (Number.isFinite(fromState) && fromState > 0)
        return fromState;
    return 5000;
}
export function fallbackWindowMsResolve(durationMs) {
    const scaled = durationMs * FALLBACK_WINDOW_RATIO;
    return Math.max(FALLBACK_WINDOW_MIN_MS, Math.min(FALLBACK_WINDOW_MAX_MS, scaled));
}
export function fallbackRangeOnLeftFromDuration(durationMs) {
    const windowMs = fallbackWindowMsResolve(durationMs);
    const end = Math.min(durationMs, windowMs);
    return { start: 0, end };
}
export function contiguousRangeClusterBestBuild(ranges, gapMs, options = {}) {
    if (!ranges.length)
        return null;
    const sorted = ranges
        .slice()
        .sort((left, right) => left.start - right.start || left.end - right.end);
    const clusters = contiguousRangeClustersBuildFromSortedRanges(sorted, gapMs);
    return clusters.reduce((best, cluster) => {
        if (!best)
            return cluster;
        if (options.preferCount) {
            const bestCount = best.ranges?.length ?? 0;
            const clusterCount = cluster.ranges?.length ?? 0;
            if (clusterCount > bestCount)
                return cluster;
            if (clusterCount < bestCount)
                return best;
        }
        const bestWidth = best.end - best.start;
        const currentWidth = cluster.end - cluster.start;
        if (currentWidth > bestWidth)
            return cluster;
        if (currentWidth === bestWidth && cluster.start < best.start)
            return cluster;
        return best;
    }, null);
}
export function contiguousRangeClustersBuildFromSortedRanges(sortedRanges, gapMs) {
    const clusters = [];
    sortedRanges.forEach((range) => {
        const current = clusters[clusters.length - 1];
        if (!current || range.start - current.end > gapMs) {
            clusters.push({ ...range, ranges: [{ ...range }] });
            return;
        }
        current.end = Math.max(current.end, range.end);
        current.ranges.push({ ...range });
    });
    return clusters;
}
export function rangeClusterNormalizeByMedianDuration(range) {
    if (!range?.ranges?.length)
        return range ? { start: range.start, end: range.end } : null;
    const durations = range.ranges
        .map((entry) => rangeDurationMs(entry))
        .filter((duration) => Number.isFinite(duration) && duration > 0)
        .sort((left, right) => left - right);
    if (!durations.length)
        return { start: range.start, end: range.end };
    const median = durations[Math.floor(durations.length / 2)];
    const minDuration = median * TAP_CLUSTER_OUTLIER_MIN_RATIO;
    const maxDuration = median * TAP_CLUSTER_OUTLIER_MAX_RATIO;
    const normalized = range.ranges.filter((entry) => {
        const duration = rangeDurationMs(entry);
        return duration >= minDuration && duration <= maxDuration;
    });
    if (!normalized.length)
        return { start: range.start, end: range.end };
    return { start: normalized[0].start, end: normalized[normalized.length - 1].end };
}
export function rangeDurationMs(range) {
    return range.end - range.start;
}

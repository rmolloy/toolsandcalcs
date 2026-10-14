export function seriesValueSampleAtFrequency(series, frequency) {
    if (!Array.isArray(series) || !series.length || !Number.isFinite(frequency))
        return null;
    let index = 0;
    while (index + 1 < series.length && series[index + 1].x < frequency) {
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
    const ratio = (frequency - left.x) / (right.x - left.x);
    return left.y + ratio * (right.y - left.y);
}
export function seriesValuesSampleAtFrequencies(series, frequencies, fallback = 0) {
    if (!Array.isArray(series) || !series.length)
        return null;
    return frequencies.map((frequency) => {
        const value = seriesValueSampleAtFrequency(series, frequency);
        return Number.isFinite(value) ? value : fallback;
    });
}

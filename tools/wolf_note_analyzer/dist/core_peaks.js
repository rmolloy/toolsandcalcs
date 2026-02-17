import { median } from "./core_math.js";
export function refineParabolicPeak(freqs, ys, idx) {
    if (idx <= 0 || idx >= ys.length - 1)
        return null;
    const a = ys[idx - 1];
    const b = ys[idx];
    const c = ys[idx + 1];
    const bw = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
    if (!bw || !Number.isFinite(bw) || bw <= 0)
        return null;
    const denom = a - (2 * b) + c;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12)
        return null;
    const delta = 0.5 * (a - c) / denom;
    const clamped = Math.max(-1, Math.min(1, delta));
    const freq = freqs[idx] + clamped * bw;
    const y = b - ((a - c) * clamped) / 4;
    return { freq, y, delta: clamped };
}
export function analyzeModes(spectrum, bands) {
    const { freqs, dbs } = spectrum;
    return Object.entries(bands).map(([key, band]) => modeResultFromBand(key, band, freqs, dbs));
}
export function estimateQFromDb(freqs, dbs, peak) {
    return qFromPeakDbIfAvailable(freqs, dbs, peakFrequencyAndDb(peak));
}
export function modeBandWidth(freq) {
    return Math.max(40, freq * 0.03);
}
export function partialBandWidth(partialKey, freq) {
    if (partialKey === "h2" || partialKey === "h3")
        return Math.max(40, freq * 0.04);
    return Math.max(40, freq * 0.03);
}
export function bandOverlapRatio(f1, bw1, f2, bw2) {
    const [half1, half2] = [bw1 / 2, bw2 / 2];
    const left = Math.max(f1 - half1, f2 - half2);
    const right = Math.min(f1 + half1, f2 + half2);
    const overlap = Math.max(0, right - left);
    const denom = Math.max(1e-6, Math.min(bw1, bw2));
    return overlap / denom;
}
function collectBandPeaks(freqs, dbs, band) {
    const peaks = [];
    for (let i = 1; i < freqs.length - 1; i += 1) {
        if (!(dbs[i] > dbs[i - 1] && dbs[i] > dbs[i + 1]))
            continue;
        const f = freqs[i];
        if (f < band.low || f > band.high)
            continue;
        const start = Math.max(0, i - 6);
        const end = Math.min(dbs.length - 1, i + 6);
        const neighbors = dbs.slice(start, end + 1);
        neighbors.splice(i - start, 1);
        const baseline = neighbors.length ? median(neighbors) : dbs[i];
        const prominence = dbs[i] - baseline;
        peaks.push({ idx: i, db: dbs[i], prominence });
    }
    return peaks;
}
function pickPeakByDbReducer(best, peak) {
    return peak.db > best.db ? peak : best;
}
function pickPeakByDb(peaks) {
    if (!peaks.length)
        return null;
    return peaks.reduce(pickPeakByDbReducer, peaks[0]);
}
function modeResultFromPeak(mode, freqs, dbs, peak) {
    const refined = refineParabolicPeak(freqs, dbs, peak.idx);
    return refined
        ? {
            mode,
            peakFreq: refined.freq,
            peakDb: refined.y,
            peakIdx: peak.idx,
            prominenceDb: peak.prominence,
        }
        : {
            mode,
            peakFreq: freqs[peak.idx],
            peakDb: dbs[peak.idx],
            peakIdx: peak.idx,
            prominenceDb: peak.prominence,
        };
}
function modeResultFromBand(modeKey, band, freqs, dbs) {
    const peaks = collectBandPeaks(freqs, dbs, band);
    const primary = pickPeakByDb(peaks);
    return modeResultFromPrimaryPeak(modeKey, freqs, dbs, primary);
}
function modeResultFromPrimaryPeak(modeKey, freqs, dbs, primary) {
    return primary
        ? modeResultFromPeak(modeKey, freqs, dbs, primary)
        : { mode: modeKey, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
}
function findNearestIndex(values, target) {
    return scanNearestIndex(values, target);
}
function scanNearestIndex(values, target) {
    return scanNearestIndexState(values, target).idx;
}
function scanNearestIndexState(values, target) {
    return reduceNearestState(values, target, { idx: 0, bestDist: Infinity });
}
function reduceNearestState(values, target, state) {
    for (let i = 0; i < values.length; i += 1) {
        state = updateNearestState(state, values[i], i, target);
    }
    return state;
}
function updateNearestState(state, value, idx, target) {
    const dist = Math.abs(value - target);
    if (dist >= state.bestDist)
        return state;
    return { idx, bestDist: dist };
}
function findLeftCrossing(freqs, dbs, idx, cutoff) {
    const left = scanLeftIndexForCutoff(dbs, idx, cutoff);
    return left === idx ? null : interpolateDbCrossing(freqs, dbs, cutoff, left, Math.min(left + 1, freqs.length - 1));
}
function scanLeftIndexForCutoff(dbs, startIdx, cutoff) {
    let left = startIdx;
    for (; left > 0 && dbs[left] > cutoff; left -= 1) { }
    return left;
}
function findRightCrossing(freqs, dbs, idx, cutoff) {
    const right = scanRightIndexForCutoff(dbs, idx, cutoff);
    return right === idx ? null : interpolateDbCrossing(freqs, dbs, cutoff, Math.max(0, right - 1), right);
}
function scanRightIndexForCutoff(dbs, startIdx, cutoff) {
    let right = startIdx;
    for (; right < dbs.length - 1 && dbs[right] > cutoff; right += 1) { }
    return right;
}
function interpolateDbCrossing(freqs, dbs, cutoff, i0, i1) {
    const sample = crossingSamples(freqs, dbs, i0, i1);
    if (!sample)
        return null;
    const t = interpolationFraction(cutoff, sample.yA, sample.yB);
    return t === null ? null : interpolateSample(sample, t);
}
function interpolateSample(sample, t) {
    const tt = Math.max(0, Math.min(1, t));
    return sample.fA + tt * (sample.fB - sample.fA);
}
function crossingSamples(freqs, dbs, i0, i1) {
    const fA = freqs[i0];
    const fB = freqs[i1];
    const yA = dbs[i0];
    const yB = dbs[i1];
    return finiteCrossingSamples(fA, fB, yA, yB);
}
function finiteCrossingSamples(fA, fB, yA, yB) {
    if (!Number.isFinite(fA) || !Number.isFinite(fB) || !Number.isFinite(yA) || !Number.isFinite(yB))
        return null;
    return { fA, fB, yA, yB };
}
function interpolationFraction(cutoff, yA, yB) {
    const t = (cutoff - yA) / (yB - yA);
    return Number.isFinite(t) ? t : null;
}
function qFromPeakDbIfAvailable(freqs, dbs, peakValues) {
    if (!peakValues)
        return null;
    return qFromPeakDb(freqs, dbs, peakValues.f0, peakValues.peakDb);
}
function peakFrequencyAndDb(peak) {
    const { freq: f0, db: peakDb } = peak;
    return peakFrequencyAndDbIfFinite(f0, peakDb);
}
function peakFrequencyAndDbIfFinite(f0, peakDb) {
    if (!Number.isFinite(f0) || !Number.isFinite(peakDb))
        return null;
    return peakFrequencyAndDbFromValues(f0, peakDb);
}
function peakFrequencyAndDbFromValues(f0, peakDb) {
    return { f0, peakDb };
}
function qFromPeakDb(freqs, dbs, f0, peakDb) {
    const cutoff = cutoffDbFromPeak(peakDb);
    const idx = peakIndexFromFrequency(freqs, f0);
    const crossings = crossingFrequenciesForCutoff(freqs, dbs, idx, cutoff);
    return qFromCrossingsIfAvailable(f0, crossings);
}
function qFromCrossingsIfAvailable(f0, crossings) {
    if (!crossings)
        return null;
    return qFromCrossings(f0, crossings.leftF, crossings.rightF);
}
function cutoffDbFromPeak(peakDb) {
    return peakDb - 3;
}
function peakIndexFromFrequency(freqs, f0) {
    return findNearestIndex(freqs, f0);
}
function crossingFrequenciesForCutoff(freqs, dbs, idx, cutoff) {
    const leftF = findLeftCrossing(freqs, dbs, idx, cutoff);
    const rightF = findRightCrossing(freqs, dbs, idx, cutoff);
    return crossingsFromOptionalFrequencies(leftF, rightF);
}
function crossingsFromOptionalFrequencies(leftF, rightF) {
    if (!Number.isFinite(leftF) || !Number.isFinite(rightF))
        return null;
    return { leftF: leftF, rightF: rightF };
}
function qFromCrossings(f0, leftF, rightF) {
    const bw = Math.max(1e-6, Math.abs(rightF - leftF));
    return qFromBandwidth(f0, bw);
}
function qFromBandwidth(f0, bw) {
    return qFromValidatedValue(qFromBandwidthValue(f0, bw));
}
function qFromBandwidthValue(f0, bw) {
    return f0 / bw;
}
function qFromValidatedValue(q) {
    if (!Number.isFinite(q) || q <= 0)
        return null;
    return q;
}

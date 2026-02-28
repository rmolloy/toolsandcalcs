import { modeBands } from "./resonate_mode_config.js";
import { median } from "./resonate_mode_metrics.js";
import { resonanceParabolicPeakRefineEnabled } from "./resonate_debug_flags.js";
export function smoothSpectrumFast(freqs, mags, smoothHz) {
    if (!smoothHz || smoothHz <= 0)
        return mags;
    if (freqs.length < 3 || mags.length < 3)
        return mags;
    const bw = Math.abs(freqs[1] - freqs[0]);
    if (!Number.isFinite(bw) || bw <= 0)
        return mags;
    const r = Math.max(1, Math.round(smoothHz / bw));
    const n = mags.length;
    const prefix = new Float64Array(n + 1);
    const prefixIdx = new Float64Array(n + 1);
    for (let i = 0; i < n; i += 1) {
        const v = mags[i];
        prefix[i + 1] = prefix[i] + v;
        prefixIdx[i + 1] = prefixIdx[i] + v * i;
    }
    const sumRange = (a, b) => prefix[b + 1] - prefix[a];
    const sumIdxRange = (a, b) => prefixIdx[b + 1] - prefixIdx[a];
    const out = new Array(n);
    const denom = r;
    for (let i = 0; i < n; i += 1) {
        const lo = Math.max(0, i - r);
        const hi = Math.min(n - 1, i + r);
        const leftLo = lo;
        const leftHi = Math.max(lo, i - 1);
        const rightLo = Math.min(hi, i + 1);
        const rightHi = hi;
        let acc = mags[i];
        let wSum = 1;
        if (leftHi >= leftLo && i - 1 >= lo) {
            const count = leftHi - leftLo + 1;
            const base = 1 + i / denom;
            const sumV = sumRange(leftLo, leftHi);
            const sumIV = sumIdxRange(leftLo, leftHi);
            acc += base * sumV - (1 / denom) * sumIV;
            wSum += count * base - (1 / denom) * ((leftLo + leftHi) * count / 2);
        }
        if (rightHi >= rightLo && i + 1 <= hi) {
            const count = rightHi - rightLo + 1;
            const base = 1 - i / denom;
            const sumV = sumRange(rightLo, rightHi);
            const sumIV = sumIdxRange(rightLo, rightHi);
            acc += base * sumV + (1 / denom) * sumIV;
            wSum += count * base + (1 / denom) * ((rightLo + rightHi) * count / 2);
        }
        out[i] = wSum > 0 ? acc / wSum : mags[i];
    }
    return out;
}
function refineParabolicPeak(freqs, ys, idx) {
    if (idx <= 0 || idx >= ys.length - 1)
        return null;
    const a = ys[idx - 1];
    const b = ys[idx];
    const c = ys[idx + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c))
        return null;
    const bw = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
    if (!bw || !Number.isFinite(bw) || bw <= 0)
        return null;
    const denom = a - (2 * b) + c;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12)
        return null;
    const delta = 0.5 * (a - c) / denom;
    if (!Number.isFinite(delta))
        return null;
    const clamped = Math.max(-1, Math.min(1, delta));
    const freq = freqs[idx] + clamped * bw;
    const y = b - ((a - c) * clamped) / 4;
    return { freq, y, delta: clamped };
}
export function analyzeModes(spectrum) {
    return analyzeModesWithBands(spectrum, modeBands);
}
export function analyzeModesWithBands(spectrum, bands) {
    const { freqs, dbs } = spectrum;
    return Object.entries(bands).map(([key, band]) => {
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
        if (!peaks.length)
            return { mode: key, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
        peaks.sort((a, b) => b.db - a.db);
        const primary = peaks[0];
        const refined = resonanceParabolicPeakRefineEnabled() ? refineParabolicPeak(freqs, dbs, primary.idx) : null;
        if (refined)
            return { mode: key, peakFreq: refined.freq, peakDb: refined.y, peakIdx: primary.idx, prominenceDb: primary.prominence };
        return { mode: key, peakFreq: freqs[primary.idx], peakDb: dbs[primary.idx], peakIdx: primary.idx, prominenceDb: primary.prominence };
    });
}

(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DOF_MODE_BANDS = void 0;
    exports.peakFreqInBand = peakFreqInBand;
    exports.median = median;
    exports.refineParabolicPeak = refineParabolicPeak;
    exports.collectLocalPeaks = collectLocalPeaks;
    exports.pickDominantPeak = pickDominantPeak;
    exports.assignPeaksToModes = assignPeaksToModes;
    exports.modelPeaksFromResponse = modelPeaksFromResponse;
    exports.DOF_MODE_BANDS = {
        air: { low: 75, high: 115 },
        top: { low: 150, high: 205 },
        back: { low: 210, high: 260 },
    };
    function peakFreqInBand(series, band) {
        let bestX = null;
        let bestY = -Infinity;
        for (let i = 0; i < series.length; i += 1) {
            const point = series[i];
            if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
                continue;
            if (point.x < band.low || point.x > band.high)
                continue;
            if (point.y > bestY) {
                bestY = point.y;
                bestX = point.x;
            }
        }
        return bestX;
    }
    function median(values) {
        if (!values.length)
            return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    function refineParabolicPeak(xs, ys, idx) {
        if (idx <= 0 || idx >= ys.length - 1)
            return null;
        const a = ys[idx - 1];
        const b = ys[idx];
        const c = ys[idx + 1];
        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c))
            return null;
        const bw = xs.length > 1 ? Math.abs(xs[1] - xs[0]) : null;
        if (!bw || !Number.isFinite(bw) || bw <= 0)
            return null;
        const denom = a - (2 * b) + c;
        if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12)
            return null;
        const delta = 0.5 * (a - c) / denom;
        if (!Number.isFinite(delta))
            return null;
        const clamped = Math.max(-1, Math.min(1, delta));
        const freq = xs[idx] + clamped * bw;
        const y = b - ((a - c) * clamped) / 4;
        return { freq, y, delta: clamped };
    }
    function collectLocalPeaks(series, band) {
        var _a, _b;
        if (!Array.isArray(series) || series.length < 3)
            return [];
        const xs = series.map((point) => point === null || point === void 0 ? void 0 : point.x);
        const ys = series.map((point) => point === null || point === void 0 ? void 0 : point.y);
        const peaks = [];
        for (let i = 1; i < series.length - 1; i += 1) {
            const y = ys[i];
            const yPrevious = ys[i - 1];
            const yNext = ys[i + 1];
            if (!Number.isFinite(y) || !Number.isFinite(yPrevious) || !Number.isFinite(yNext))
                continue;
            if (!(y > yPrevious && y > yNext))
                continue;
            const x = xs[i];
            if (!Number.isFinite(x))
                continue;
            if (band && (x < band.low || x > band.high))
                continue;
            const start = Math.max(0, i - 6);
            const end = Math.min(ys.length - 1, i + 6);
            const neighbors = [];
            for (let j = start; j <= end; j += 1) {
                if (j === i)
                    continue;
                const value = ys[j];
                if (Number.isFinite(value))
                    neighbors.push(value);
            }
            const baseline = neighbors.length ? median(neighbors) : y;
            const prominence = y - baseline;
            const refined = refineParabolicPeak(xs, ys, i);
            peaks.push({
                idx: i,
                freq: (_a = refined === null || refined === void 0 ? void 0 : refined.freq) !== null && _a !== void 0 ? _a : x,
                db: (_b = refined === null || refined === void 0 ? void 0 : refined.y) !== null && _b !== void 0 ? _b : y,
                prominence,
            });
        }
        return peaks;
    }
    function pickDominantPeak(series, band) {
        const peaks = collectLocalPeaks(series, band);
        if (!peaks.length)
            return null;
        peaks.sort((a, b) => b.prominence - a.prominence);
        return peaks[0];
    }
    function assignPeaksToModes(totalPeaks, targets) {
        const modes = ["air", "top", "back"];
        const assigned = { air: null, top: null, back: null };
        if (!totalPeaks.length)
            return assigned;
        if (totalPeaks.length >= modes.length) {
            const permutations = [
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
                    cost += Math.abs(peak.freq - target);
                });
                if (cost < bestCost) {
                    bestCost = cost;
                    best = permutation;
                }
            });
            modes.forEach((mode, index) => {
                var _a, _b;
                assigned[mode] = (_b = (_a = totalPeaks[best[index]]) === null || _a === void 0 ? void 0 : _a.freq) !== null && _b !== void 0 ? _b : null;
            });
            return assigned;
        }
        const remaining = totalPeaks.slice();
        modes.forEach((mode) => {
            var _a;
            if (!remaining.length)
                return;
            const target = targets[mode];
            let bestIndex = 0;
            let bestDistance = Infinity;
            for (let i = 0; i < remaining.length; i += 1) {
                const distance = Number.isFinite(target)
                    ? Math.abs(remaining[i].freq - target)
                    : 0;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = i;
                }
            }
            const chosen = remaining.splice(bestIndex, 1)[0];
            assigned[mode] = (_a = chosen === null || chosen === void 0 ? void 0 : chosen.freq) !== null && _a !== void 0 ? _a : null;
        });
        return assigned;
    }
    function modelPeaksFromResponse(response) {
        var _a, _b, _c, _d, _e, _f;
        const total = response === null || response === void 0 ? void 0 : response.total;
        if (!Array.isArray(total) || !total.length)
            return null;
        const totalPeaks = collectLocalPeaks(total)
            .sort((a, b) => b.prominence - a.prominence)
            .slice(0, 3);
        if (!totalPeaks.length) {
            return {
                air: peakFreqInBand(total, exports.DOF_MODE_BANDS.air),
                top: peakFreqInBand(total, exports.DOF_MODE_BANDS.top),
                back: peakFreqInBand(total, exports.DOF_MODE_BANDS.back),
            };
        }
        const bandCenter = (mode) => (exports.DOF_MODE_BANDS[mode].low + exports.DOF_MODE_BANDS[mode].high) / 2;
        const componentPeaks = {
            air: pickDominantPeak((response === null || response === void 0 ? void 0 : response.air) || [], exports.DOF_MODE_BANDS.air),
            top: pickDominantPeak((response === null || response === void 0 ? void 0 : response.top) || [], exports.DOF_MODE_BANDS.top),
            back: pickDominantPeak((response === null || response === void 0 ? void 0 : response.back) || [], exports.DOF_MODE_BANDS.back),
        };
        const targets = {
            air: (_b = (_a = componentPeaks.air) === null || _a === void 0 ? void 0 : _a.freq) !== null && _b !== void 0 ? _b : bandCenter("air"),
            top: (_d = (_c = componentPeaks.top) === null || _c === void 0 ? void 0 : _c.freq) !== null && _d !== void 0 ? _d : bandCenter("top"),
            back: (_f = (_e = componentPeaks.back) === null || _e === void 0 ? void 0 : _e.freq) !== null && _f !== void 0 ? _f : bandCenter("back"),
        };
        return assignPeaksToModes(totalPeaks, targets);
    }
});

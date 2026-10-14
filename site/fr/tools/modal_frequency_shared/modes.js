"use strict";
(() => {
    const MODE_DEFAULTS = {
        air: { low: 75, high: 115 },
        top: { low: 150, high: 205 },
        back: { low: 210, high: 260 },
    };
    const MODE_COLORS = {
        air: "#56B4E9",
        top: "#E69F00",
        back: "#009E73",
    };
    function modeLabel(key) {
        if (key === "air")
            return "Air";
        if (key === "top")
            return "Top";
        if (key === "back")
            return "Back";
        return key;
    }
    function normalizeRange(low, high, fallback) {
        const safeLow = Number.isFinite(low) ? low : fallback === null || fallback === void 0 ? void 0 : fallback.low;
        const safeHigh = Number.isFinite(high) ? high : fallback === null || fallback === void 0 ? void 0 : fallback.high;
        const lo = Number.isFinite(safeLow) ? safeLow : 0;
        const hi = Number.isFinite(safeHigh) ? safeHigh : lo;
        return {
            low: Math.min(lo, hi),
            high: Math.max(lo, hi),
        };
    }
    function readModeRanges(config) {
        const ranges = {};
        Object.entries(config).forEach(([key, ids]) => {
            const defaults = MODE_DEFAULTS[key];
            const lowEl = document.getElementById(ids.low);
            const highEl = document.getElementById(ids.high);
            const lowVal = lowEl ? Number(lowEl.value) : defaults === null || defaults === void 0 ? void 0 : defaults.low;
            const highVal = highEl ? Number(highEl.value) : defaults === null || defaults === void 0 ? void 0 : defaults.high;
            const band = normalizeRange(lowVal, highVal, defaults);
            ranges[key] = { ...band, peak: null };
        });
        return ranges;
    }
    function buildModeAnnotations(modeRefs) {
        const anns = [];
        Object.entries(modeRefs).forEach(([key, band]) => {
            if (!band)
                return;
            const center = (band.low + band.high) / 2;
            if (!Number.isFinite(center))
                return;
            anns.push({
                freq: center,
                label: modeLabel(key),
                color: MODE_COLORS[key] || undefined,
            });
        });
        return anns;
    }
    function buildModeAnnotationsFromSpectrum(modeRefs, spectrum) {
        var _a, _b;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length))
            return [];
        const dbs = ((_b = spectrum.dbs) === null || _b === void 0 ? void 0 : _b.length) ? spectrum.dbs : spectrum.mags || [];
        const anns = [];
        Object.entries(modeRefs).forEach(([key, band]) => {
            if (!band)
                return;
            let bestIdx = -1;
            let bestDb = -Infinity;
            spectrum.freqs.forEach((f, idx) => {
                if (f >= band.low && f <= band.high && dbs[idx] > bestDb) {
                    bestDb = dbs[idx];
                    bestIdx = idx;
                }
            });
            if (bestIdx >= 0) {
                const freq = spectrum.freqs[bestIdx];
                anns.push({
                    freq,
                    label: modeLabel(key),
                    color: MODE_COLORS[key] || undefined,
                });
            }
        });
        return anns;
    }
    function dbArray(spectrum) {
        var _a, _b, _c;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length))
            return null;
        if ((_b = spectrum.dbs) === null || _b === void 0 ? void 0 : _b.length)
            return Array.from(spectrum.dbs);
        if ((_c = spectrum.mags) === null || _c === void 0 ? void 0 : _c.length) {
            const mags = spectrum.mags;
            return Array.from(mags, (m) => 20 * Math.log10(Math.max(m, 1e-12)));
        }
        return null;
    }
    function estimateModeQ(spectrum, targetFreq) {
        var _a, _b, _c;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length) || !Number.isFinite(targetFreq))
            return null;
        const freqs = spectrum.freqs;
        const dbs = dbArray(spectrum);
        if (!(dbs === null || dbs === void 0 ? void 0 : dbs.length))
            return null;
        let idx = 0;
        let bestDist = Infinity;
        freqs.forEach((f, i) => {
            const d = Math.abs(f - targetFreq);
            if (d < bestDist) {
                bestDist = d;
                idx = i;
            }
        });
        const peakDb = dbs[idx];
        if (!Number.isFinite(peakDb))
            return null;
        const cutoff = peakDb - 3;
        let leftIdx = idx;
        while (leftIdx > 0 && dbs[leftIdx] > cutoff)
            leftIdx -= 1;
        let rightIdx = idx;
        while (rightIdx < dbs.length - 1 && dbs[rightIdx] > cutoff)
            rightIdx += 1;
        const leftFreq = (_b = freqs[leftIdx]) !== null && _b !== void 0 ? _b : targetFreq;
        const rightFreq = (_c = freqs[rightIdx]) !== null && _c !== void 0 ? _c : targetFreq;
        const bw = Math.max(1e-6, Math.abs(rightFreq - leftFreq));
        return targetFreq / bw;
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.ModalModes = {
        MODE_DEFAULTS,
        MODE_COLORS,
        modeLabel,
        normalizeRange,
        readModeRanges,
        buildModeAnnotations,
        buildModeAnnotationsFromSpectrum,
        estimateModeQ,
    };
})();

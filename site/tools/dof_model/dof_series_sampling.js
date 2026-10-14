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
    exports.sampleDofSeriesAtFrequency = sampleDofSeriesAtFrequency;
    function sampleDofSeriesAtFrequency(series, frequency) {
        if (!Array.isArray(series) || !series.length || !Number.isFinite(frequency)) {
            return null;
        }
        let lowerIndex = 0;
        while (lowerIndex + 1 < series.length
            && series[lowerIndex + 1].x < frequency) {
            lowerIndex += 1;
        }
        const lower = series[lowerIndex];
        const upper = series[Math.min(lowerIndex + 1, series.length - 1)];
        if (!Number.isFinite(lower === null || lower === void 0 ? void 0 : lower.x) || !Number.isFinite(lower === null || lower === void 0 ? void 0 : lower.y)) {
            return Number.isFinite(upper === null || upper === void 0 ? void 0 : upper.y) ? upper.y : null;
        }
        if (!Number.isFinite(upper === null || upper === void 0 ? void 0 : upper.x)
            || !Number.isFinite(upper === null || upper === void 0 ? void 0 : upper.y)
            || lower.x === upper.x) {
            return lower.y;
        }
        const fraction = (frequency - lower.x) / (upper.x - lower.x);
        return lower.y + fraction * (upper.y - lower.y);
    }
});

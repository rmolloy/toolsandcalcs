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
    exports.seriesValueSampleAtFrequency = seriesValueSampleAtFrequency;
    exports.seriesValuesSampleAtFrequencies = seriesValuesSampleAtFrequencies;
    function seriesValueSampleAtFrequency(series, frequency) {
        if (!Array.isArray(series) || !series.length || !Number.isFinite(frequency))
            return null;
        let index = 0;
        while (index + 1 < series.length && series[index + 1].x < frequency) {
            index += 1;
        }
        const left = series[index];
        const right = series[Math.min(index + 1, series.length - 1)];
        if (!Number.isFinite(left === null || left === void 0 ? void 0 : left.x) || !Number.isFinite(left === null || left === void 0 ? void 0 : left.y)) {
            return Number.isFinite(right === null || right === void 0 ? void 0 : right.y) ? right.y : null;
        }
        if (!Number.isFinite(right === null || right === void 0 ? void 0 : right.x) || !Number.isFinite(right === null || right === void 0 ? void 0 : right.y) || left.x === right.x) {
            return left.y;
        }
        const ratio = (frequency - left.x) / (right.x - left.x);
        return left.y + ratio * (right.y - left.y);
    }
    function seriesValuesSampleAtFrequencies(series, frequencies, fallback = 0) {
        if (!Array.isArray(series) || !series.length)
            return null;
        return frequencies.map((frequency) => {
            const value = seriesValueSampleAtFrequency(series, frequency);
            return Number.isFinite(value) ? value : fallback;
        });
    }
});

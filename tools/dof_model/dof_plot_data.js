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
    exports.buildDofTrace = buildDofTrace;
    exports.buildDofTargetOverlaySegments = buildDofTargetOverlaySegments;
    exports.buildDofTargetOverlayTraces = buildDofTargetOverlayTraces;
    exports.computeDofYRange = computeDofYRange;
    function buildDofTrace(points, name, color, lineOptions = {}) {
        if (!Array.isArray(points) || points.length === 0)
            return null;
        return {
            x: points.map((point) => point.x),
            y: points.map((point) => point.y),
            mode: "lines",
            name,
            line: { color, ...(lineOptions || {}) },
            hovertemplate: `%{x:.1f} Hz · %{y:.1f} dB<extra>${name}</extra>`,
        };
    }
    function overlayBucketFromWeight(weight, config) {
        if (weight > 0.66) {
            return { width: config.widths.thick, opacity: config.opacities.thick };
        }
        if (weight > 0.33) {
            return { width: config.widths.mid, opacity: config.opacities.mid };
        }
        return { width: config.widths.thin, opacity: config.opacities.thin };
    }
    function overlayWeightAtFrequency(frequency, config) {
        const { min, max, feather } = config;
        if (frequency >= min && frequency <= max)
            return 1;
        if (frequency >= min - feather && frequency < min) {
            return 1 - (min - frequency) / feather;
        }
        if (frequency > max && frequency <= max + feather) {
            return 1 - (frequency - max) / feather;
        }
        return 0;
    }
    function buildDofTargetOverlaySegments(points, config, sharedBuilder) {
        if (sharedBuilder)
            return sharedBuilder(points, config);
        const segments = [];
        let current = null;
        points.forEach((point) => {
            const frequency = point === null || point === void 0 ? void 0 : point.x;
            const level = point === null || point === void 0 ? void 0 : point.y;
            if (!Number.isFinite(frequency) || !Number.isFinite(level)) {
                current = null;
                return;
            }
            const weight = overlayWeightAtFrequency(frequency, config);
            if (weight <= 0) {
                current = null;
                return;
            }
            const bucket = overlayBucketFromWeight(weight, config);
            const sameBucket = current
                && current.width === bucket.width
                && current.opacity === bucket.opacity;
            if (!sameBucket) {
                current = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
                segments.push(current);
            }
            current.x.push(frequency);
            current.y.push(level);
        });
        return segments;
    }
    function buildDofTargetOverlayTraces(points, color, config, colorWithAlpha, sharedBuilder) {
        const segments = buildDofTargetOverlaySegments(points, config, sharedBuilder);
        return segments.map((segment, index) => ({
            x: segment.x,
            y: segment.y,
            mode: "lines",
            name: "Target",
            legendgroup: "target",
            showlegend: index === 0,
            line: {
                color: colorWithAlpha(color, segment.opacity),
                width: segment.width,
                dash: "dash",
            },
            hovertemplate: "%{x:.1f} Hz · %{y:.1f} dB<extra>Target</extra>",
        }));
    }
    function computeDofYRange(series, pad = 6, minX, maxX) {
        if (!Array.isArray(series) || !series.length)
            return null;
        let min = Infinity;
        let max = -Infinity;
        series.forEach((point) => {
            if (!Number.isFinite(point === null || point === void 0 ? void 0 : point.y))
                return;
            if (Number.isFinite(minX) && Number.isFinite(maxX)) {
                if (!Number.isFinite(point === null || point === void 0 ? void 0 : point.x))
                    return;
                if (point.x < minX || point.x > maxX)
                    return;
            }
            min = Math.min(min, point.y);
            max = Math.max(max, point.y);
        });
        if (!Number.isFinite(min) || !Number.isFinite(max))
            return null;
        const padding = Math.max(2, pad);
        return [min - padding, max + padding];
    }
});

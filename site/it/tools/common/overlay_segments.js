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
    exports.overlaySegmentsBuildFromPoints = overlaySegmentsBuildFromPoints;
    exports.overlaySegmentsBuildFromArrays = overlaySegmentsBuildFromArrays;
    function overlayWeightResolveFromFrequency(frequency, profile) {
        if (frequency >= profile.min && frequency <= profile.max)
            return 1;
        if (frequency >= profile.min - profile.feather && frequency < profile.min) {
            return 1 - (profile.min - frequency) / profile.feather;
        }
        if (frequency > profile.max && frequency <= profile.max + profile.feather) {
            return 1 - (frequency - profile.max) / profile.feather;
        }
        return 0;
    }
    function overlayBucketResolveFromWeight(weight, profile) {
        if (weight > 0.66)
            return { width: profile.widths.thick, opacity: profile.opacities.thick };
        if (weight > 0.33)
            return { width: profile.widths.mid, opacity: profile.opacities.mid };
        return { width: profile.widths.thin, opacity: profile.opacities.thin };
    }
    function overlaySegmentsBuildFromPoints(points, profile) {
        const segments = [];
        let current = null;
        points.forEach((point) => {
            if (!Number.isFinite(point === null || point === void 0 ? void 0 : point.x) || !Number.isFinite(point === null || point === void 0 ? void 0 : point.y)) {
                current = null;
                return;
            }
            const weight = overlayWeightResolveFromFrequency(point.x, profile);
            if (weight <= 0) {
                current = null;
                return;
            }
            const bucket = overlayBucketResolveFromWeight(weight, profile);
            const sameBucket = current && current.width === bucket.width && current.opacity === bucket.opacity;
            if (!sameBucket) {
                current = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
                segments.push(current);
            }
            current.x.push(point.x);
            current.y.push(point.y);
        });
        return segments;
    }
    function overlaySegmentsBuildFromArrays(freqs, values, profile) {
        const points = freqs.map((x, index) => ({ x, y: values[index] }));
        return overlaySegmentsBuildFromPoints(points, profile);
    }
});

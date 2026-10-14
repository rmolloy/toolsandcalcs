(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./brace-geometry.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BraceMatchPlan = void 0;
    exports.braceMatchPlanSolve = braceMatchPlanSolve;
    const brace_geometry_js_1 = require("./brace-geometry.js");
    function braceMatchPlanSolve(brace, stock, optionsOrIncrement = 0.1) {
        const options = braceMatchPlanOptionsResolve(optionsOrIncrement);
        braceMatchPlanStockValidate(stock);
        braceMatchPlanOptionsValidate(options);
        const plannedBreadth = braceMatchPlanDefaultBreadthResolve(brace.segments);
        const planned = (0, brace_geometry_js_1.computeBraceGeometry)(plannedBreadth, brace.segments);
        const scales = braceMatchPlanScalesCalculate(planned, stock, plannedBreadth, options);
        const exactSegments = brace.segments.map((segment) => braceMatchPlanSegmentScale(segment, plannedBreadth, scales, stock, null));
        const constraintNotices = [];
        const proposedSegments = exactSegments.map((segment) => braceMatchPlanSegmentConstrain(segment, options, constraintNotices));
        const exactBreadth = braceMatchPlanDefaultBreadthResolve(exactSegments);
        const proposedBreadth = braceMatchPlanDefaultBreadthResolve(proposedSegments);
        const exact = (0, brace_geometry_js_1.computeBraceGeometry)(exactBreadth, exactSegments);
        const proposed = (0, brace_geometry_js_1.computeBraceGeometry)(proposedBreadth, proposedSegments);
        return {
            id: brace.id,
            name: brace.name,
            planned,
            exact,
            proposed,
            exactSegments,
            proposedSegments,
            breadthScale: scales.breadth,
            heightScale: scales.height,
            rigidityDifferencePercent: braceMatchPlanDifferencePercent(proposed.EI, planned.EI),
            massDifferencePercent: braceMatchPlanDifferencePercent(proposed.massPerLength, planned.massPerLength),
            constraintNotices: [...new Set(constraintNotices)],
        };
    }
    function braceMatchPlanScalesCalculate(planned, stock, plannedBreadthMm, options) {
        const areaM2 = planned.area * 1e-6;
        const inertiaM4 = planned.I * 1e-12;
        const areaScale = planned.massPerLength / (stock.densityKgM3 * areaM2);
        const rigidityScale = planned.EI / (stock.modulusGPa * 1e9 * inertiaM4);
        if (options.policy === "keep-width") {
            const breadth = options.fixedBreadthMm / plannedBreadthMm;
            return {
                breadth,
                height: Math.cbrt(rigidityScale / breadth),
            };
        }
        const height = Math.sqrt(rigidityScale / areaScale);
        const breadth = areaScale / height;
        return { breadth, height };
    }
    function braceMatchPlanSegmentScale(segment, defaultBreadth, scales, stock, incrementMm) {
        var _a;
        const height = segment.height * scales.height;
        const breadth = ((_a = segment.breadth) !== null && _a !== void 0 ? _a : defaultBreadth) * scales.breadth;
        return {
            ...segment,
            height: incrementMm ? braceMatchPlanRound(height, incrementMm) : height,
            breadth: incrementMm ? braceMatchPlanRound(breadth, incrementMm) : breadth,
            density: stock.densityKgM3,
            modulus: stock.modulusGPa,
        };
    }
    function braceMatchPlanSegmentConstrain(segment, options, notices) {
        const roundedHeight = braceMatchPlanRound(segment.height, options.incrementMm);
        const roundedBreadth = braceMatchPlanRound(segment.breadth, options.incrementMm);
        const height = Math.max(options.minimumHeightMm, roundedHeight);
        const breadth = Math.max(options.minimumBreadthMm, roundedBreadth);
        if (height !== roundedHeight)
            notices.push(`Minimum height ${options.minimumHeightMm} mm applied.`);
        if (breadth !== roundedBreadth)
            notices.push(`Minimum breadth ${options.minimumBreadthMm} mm applied.`);
        return { ...segment, height, breadth };
    }
    function braceMatchPlanDefaultBreadthResolve(segments) {
        var _a;
        const breadth = (_a = segments.find((segment) => Number.isFinite(segment.breadth))) === null || _a === void 0 ? void 0 : _a.breadth;
        if (!Number.isFinite(breadth) || breadth <= 0) {
            throw new Error("Match Plan requires a positive planned brace breadth.");
        }
        return breadth;
    }
    function braceMatchPlanDifferencePercent(actual, target) {
        return ((actual - target) / target) * 100;
    }
    function braceMatchPlanRound(value, incrementMm) {
        return Math.max(incrementMm, Math.round(value / incrementMm) * incrementMm);
    }
    function braceMatchPlanOptionsResolve(optionsOrIncrement) {
        var _a, _b, _c, _d, _e;
        const options = typeof optionsOrIncrement === "number"
            ? { incrementMm: optionsOrIncrement }
            : optionsOrIncrement;
        return {
            incrementMm: (_a = options.incrementMm) !== null && _a !== void 0 ? _a : 0.1,
            policy: (_b = options.policy) !== null && _b !== void 0 ? _b : "match-stiffness-and-weight",
            fixedBreadthMm: (_c = options.fixedBreadthMm) !== null && _c !== void 0 ? _c : 6,
            minimumBreadthMm: (_d = options.minimumBreadthMm) !== null && _d !== void 0 ? _d : 0,
            minimumHeightMm: (_e = options.minimumHeightMm) !== null && _e !== void 0 ? _e : 0,
        };
    }
    function braceMatchPlanStockValidate(stock) {
        if (!Number.isFinite(stock.densityKgM3) || stock.densityKgM3 <= 0) {
            throw new Error("Match Plan stock density must be positive.");
        }
        if (!Number.isFinite(stock.modulusGPa) || stock.modulusGPa <= 0) {
            throw new Error("Match Plan stock modulus must be positive.");
        }
    }
    function braceMatchPlanOptionsValidate(options) {
        if (!Number.isFinite(options.incrementMm) || options.incrementMm <= 0) {
            throw new Error("Match Plan increment must be positive.");
        }
        if (options.policy === "keep-width" && (!Number.isFinite(options.fixedBreadthMm) || options.fixedBreadthMm <= 0)) {
            throw new Error("Match Plan fixed breadth must be positive.");
        }
        if (!Number.isFinite(options.minimumBreadthMm) || options.minimumBreadthMm < 0) {
            throw new Error("Match Plan minimum breadth cannot be negative.");
        }
        if (!Number.isFinite(options.minimumHeightMm) || options.minimumHeightMm < 0) {
            throw new Error("Match Plan minimum height cannot be negative.");
        }
    }
    exports.BraceMatchPlan = {
        solve: braceMatchPlanSolve,
    };
    if (typeof window !== "undefined") {
        window.BraceMatchPlan = exports.BraceMatchPlan;
    }
});

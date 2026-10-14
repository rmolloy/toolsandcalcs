(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../calculator.js", "./brace-geometry.js", "./brace-match-plan.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BraceMatchSystem = void 0;
    exports.braceMatchSystemSolve = braceMatchSystemSolve;
    const calculator_js_1 = require("../calculator.js");
    const brace_geometry_js_1 = require("./brace-geometry.js");
    const brace_match_plan_js_1 = require("./brace-match-plan.js");
    function braceMatchSystemSolve(braces, stock, referenceTop, actualTop, options = {}, adjustableBraceIds) {
        braceMatchSystemTopValidate(referenceTop, "Tavola di riferimento");
        braceMatchSystemTopValidate(actualTop, "Tavola reale");
        const basePlans = braces.map((brace) => (0, brace_match_plan_js_1.braceMatchPlanSolve)(brace, stock, options));
        const adjustableIds = new Set(adjustableBraceIds !== null && adjustableBraceIds !== void 0 ? adjustableBraceIds : braces.map((brace) => brace.id));
        const targetEI = braceMatchSystemSliceCalculate(referenceTop, braces.map((brace) => brace.segments)).EI;
        const fixedBraceSegments = basePlans
            .filter((plan) => !adjustableIds.has(plan.id))
            .map((plan) => plan.planned.segments);
        const minimumEI = braceMatchSystemSliceCalculate(actualTop, fixedBraceSegments).EI;
        const unchangedSystemEI = braceMatchSystemSliceCalculate(actualTop, basePlans.map((plan) => plan.planned.segments)).EI;
        if (adjustableIds.size === 0) {
            return braceMatchSystemResultCreate(true, "Tutte le catene restano invariate; viene mostrato l'effetto della tavola reale senza ridimensionarle.", braceMatchSystemPlansPreserve(basePlans), targetEI, unchangedSystemEI, 1);
        }
        if (minimumEI >= targetEI) {
            return braceMatchSystemResultCreate(false, fixedBraceSegments.length === 0
                ? "La tavola reale da sola raggiunge o supera l'obiettivo del piano; non è possibile un abbinamento affidato solo alle catene."
                : "La tavola reale e le catene invariate raggiungono o superano l'obiettivo; ridimensiona un'altra catena o modifica i dati.", braceMatchSystemPlansPreserve(basePlans), targetEI, unchangedSystemEI, 0);
        }
        const correctionScale = braceMatchSystemHeightCorrectionSolve(targetEI, actualTop, basePlans, adjustableIds);
        const correctedPlans = braceMatchSystemPlansCorrect(basePlans, correctionScale, options, adjustableIds);
        const proposedEI = braceMatchSystemSliceCalculate(actualTop, correctedPlans.map((plan) => plan.proposedSegments)).EI;
        return braceMatchSystemResultCreate(true, braceMatchSystemMessageBuild(basePlans.length, adjustableIds.size), correctedPlans, targetEI, proposedEI, correctionScale);
    }
    function braceMatchSystemHeightCorrectionSolve(targetEI, actualTop, plans, adjustableIds) {
        const calculateEI = (heightScale) => braceMatchSystemSliceCalculate(actualTop, plans.map((plan) => adjustableIds.has(plan.id)
            ? braceMatchSystemSegmentsScaleHeight(plan.exactSegments, heightScale)
            : plan.planned.segments)).EI;
        let low = 0;
        let high = 1;
        while (calculateEI(high) < targetEI && high < 64)
            high *= 2;
        if (calculateEI(high) < targetEI) {
            throw new Error("Non è stato possibile raggiungere l'obiettivo di rigidezza del sistema entro limiti di scala pratici.");
        }
        for (let iteration = 0; iteration < 60; iteration += 1) {
            const middle = (low + high) / 2;
            if (calculateEI(middle) < targetEI)
                low = middle;
            else
                high = middle;
        }
        return (low + high) / 2;
    }
    function braceMatchSystemPlansCorrect(plans, heightScale, options, adjustableIds) {
        return plans.map((plan) => {
            if (!adjustableIds.has(plan.id))
                return braceMatchSystemPlanPreserve(plan);
            const exactSegments = braceMatchSystemSegmentsScaleHeight(plan.exactSegments, heightScale);
            const proposedSegments = braceMatchSystemSegmentsRound(exactSegments, options);
            const exact = (0, brace_geometry_js_1.computeBraceGeometry)(braceMatchSystemBreadthRead(exactSegments), exactSegments);
            const proposed = (0, brace_geometry_js_1.computeBraceGeometry)(braceMatchSystemBreadthRead(proposedSegments), proposedSegments);
            return {
                ...plan,
                exact,
                proposed,
                exactSegments,
                proposedSegments,
                heightScale: plan.heightScale * heightScale,
                rigidityDifferencePercent: braceMatchSystemDifferencePercent(proposed.EI, plan.planned.EI),
                massDifferencePercent: braceMatchSystemDifferencePercent(proposed.massPerLength, plan.planned.massPerLength),
            };
        });
    }
    function braceMatchSystemPlansPreserve(plans) {
        return plans.map(braceMatchSystemPlanPreserve);
    }
    function braceMatchSystemPlanPreserve(plan) {
        return {
            ...plan,
            exact: plan.planned,
            proposed: plan.planned,
            exactSegments: plan.planned.segments,
            proposedSegments: plan.planned.segments,
            breadthScale: 1,
            heightScale: 1,
            rigidityDifferencePercent: 0,
            massDifferencePercent: 0,
            constraintNotices: [],
        };
    }
    function braceMatchSystemMessageBuild(braceCount, adjustableCount) {
        const unchangedCount = braceCount - adjustableCount;
        if (unchangedCount === 0) {
            return "La tavola reale resta fissa; tutte le altezze delle catene vengono adattate alla rigidezza del sistema previsto.";
        }
        if (unchangedCount === 1) {
            return `La tavola reale e ${unchangedCount} catena restano invariate; le altezze rimanenti vengono adattate alla rigidezza del sistema previsto.`;
        }
        return `La tavola reale e ${unchangedCount} catene restano invariate; le altezze rimanenti vengono adattate alla rigidezza del sistema previsto.`;
    }
    function braceMatchSystemSegmentsScaleHeight(segments, heightScale) {
        return segments.map((segment) => ({
            ...segment,
            height: segment.height * heightScale,
        }));
    }
    function braceMatchSystemSegmentsRound(segments, options) {
        var _a, _b, _c;
        const increment = (_a = options.incrementMm) !== null && _a !== void 0 ? _a : 0.1;
        const minimumBreadth = (_b = options.minimumBreadthMm) !== null && _b !== void 0 ? _b : 0;
        const minimumHeight = (_c = options.minimumHeightMm) !== null && _c !== void 0 ? _c : 0;
        return segments.map((segment) => ({
            ...segment,
            breadth: Math.max(minimumBreadth, braceMatchSystemRound(segment.breadth, increment)),
            height: Math.max(minimumHeight, braceMatchSystemRound(segment.height, increment)),
        }));
    }
    function braceMatchSystemSliceCalculate(top, braceSegments) {
        return (0, calculator_js_1.computeSlice)({
            spanAA: top.spanMm,
            topThickness: top.thicknessMm,
            topModulus: top.modulusGPa * 1000,
            braces: braceSegments.map(braceMatchSystemBraceSpecCreate),
        });
    }
    function braceMatchSystemBraceSpecCreate(segments) {
        return {
            b: braceMatchSystemBreadthRead(segments),
            segments: segments.map((segment) => ({
                label: segment.label,
                shape: segment.shape,
                h: segment.height,
                breadth: segment.breadth,
                material: { E: segment.modulus * 1000 },
            })),
        };
    }
    function braceMatchSystemBreadthRead(segments) {
        return Math.max(...segments.map((segment) => segment.breadth));
    }
    function braceMatchSystemResultCreate(feasible, message, plans, targetEI, proposedEI, heightCorrectionScale) {
        return {
            feasible,
            message,
            plans,
            targetEINm2: targetEI / 1e6,
            proposedEINm2: proposedEI / 1e6,
            systemDifferencePercent: braceMatchSystemDifferencePercent(proposedEI, targetEI),
            heightCorrectionScale,
        };
    }
    function braceMatchSystemDifferencePercent(actual, target) {
        return ((actual - target) / target) * 100;
    }
    function braceMatchSystemRound(value, increment) {
        return Math.max(increment, Math.round(value / increment) * increment);
    }
    function braceMatchSystemTopValidate(top, label) {
        if (!Number.isFinite(top.spanMm) || top.spanMm <= 0)
            throw new Error(`La luce di ${label} deve essere positiva.`);
        if (!Number.isFinite(top.thicknessMm) || top.thicknessMm <= 0)
            throw new Error(`Lo spessore di ${label} deve essere positivo.`);
        if (!Number.isFinite(top.modulusGPa) || top.modulusGPa <= 0)
            throw new Error(`Il modulo di ${label} deve essere positivo.`);
    }
    exports.BraceMatchSystem = {
        solve: braceMatchSystemSolve,
    };
    if (typeof window !== "undefined") {
        window.BraceMatchSystem = exports.BraceMatchSystem;
    }
});

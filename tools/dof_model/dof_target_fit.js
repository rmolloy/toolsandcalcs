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
    exports.fitDofFromTargets = fitDofFromTargets;
    exports.buildDofFastTargetWarmParams = buildDofFastTargetWarmParams;
    function finiteTarget(targets, key) {
        const value = targets[key];
        return Number.isFinite(value) ? value : null;
    }
    function desiredFitTargetsFrom(targets) {
        return {
            air: finiteTarget(targets, "air"),
            top: finiteTarget(targets, "top"),
            back: finiteTarget(targets, "back"),
            mass_top: finiteTarget(targets, "mass_top"),
            stiffness_top: finiteTarget(targets, "stiffness_top"),
            mass_back: finiteTarget(targets, "mass_back"),
            stiffness_back: finiteTarget(targets, "stiffness_back"),
            volume_air: finiteTarget(targets, "volume_air"),
            area_hole: finiteTarget(targets, "area_hole"),
        };
    }
    function hasDesiredFitTarget(desired) {
        return Object.values(desired).some(Boolean);
    }
    function peaksForParams(params, dependencies) {
        const response = dependencies.computeResponse(dependencies.adaptParams(params));
        return response ? dependencies.peaksFromResponse(response) : null;
    }
    function warmStructuralFrequencyTargets(warm, desired, baselinePeaks, tweakIds, clamp) {
        if (!tweakIds.includes("stiffness_top") && !tweakIds.includes("stiffness_back"))
            return;
        ["top", "back"].forEach((mode) => {
            const target = desired[mode];
            const baseline = baselinePeaks === null || baselinePeaks === void 0 ? void 0 : baselinePeaks[mode];
            if (!Number.isFinite(target) || !Number.isFinite(baseline) || baseline <= 0)
                return;
            const ratio = target / baseline;
            const id = mode === "top" ? "stiffness_top" : "stiffness_back";
            if (tweakIds.includes(id))
                warm[id] = clamp(id, warm[id] * ratio * ratio);
        });
    }
    function warmAirFrequencyTarget(warm, desired, baselinePeaks, tweakIds, clamp) {
        if (!tweakIds.includes("volume_air"))
            return;
        if (!Number.isFinite(desired.air) || !Number.isFinite(baselinePeaks === null || baselinePeaks === void 0 ? void 0 : baselinePeaks.air) || baselinePeaks.air <= 0)
            return;
        const ratio = desired.air / baselinePeaks.air;
        warm.volume_air = clamp("volume_air", warm.volume_air / (ratio * ratio));
    }
    function warmDirectTarget(warm, desired, tweakIds, id, clamp) {
        if (!tweakIds.includes(id) || !Number.isFinite(desired[id]))
            return;
        warm[id] = clamp(id, desired[id]);
    }
    function warmFitParamsFrom(baseParams, desired, baselinePeaks, tweakIds, clamp) {
        const warm = { ...baseParams };
        warmStructuralFrequencyTargets(warm, desired, baselinePeaks, tweakIds, clamp);
        warmAirFrequencyTarget(warm, desired, baselinePeaks, tweakIds, clamp);
        warmDirectTarget(warm, desired, tweakIds, "mass_top", clamp);
        warmDirectTarget(warm, desired, tweakIds, "stiffness_top", clamp);
        warmDirectTarget(warm, desired, tweakIds, "mass_back", clamp);
        warmDirectTarget(warm, desired, tweakIds, "stiffness_back", clamp);
        warmDirectTarget(warm, desired, tweakIds, "volume_air", clamp);
        warmDirectTarget(warm, desired, tweakIds, "area_hole", clamp);
        return warm;
    }
    function normalizedSquaredDifference(actual, target) {
        const difference = (actual - target) / target;
        return difference * difference;
    }
    function addModeTargetCosts(cost, desired, peaks) {
        ["air", "top", "back"].forEach((mode) => {
            const target = desired[mode];
            const predicted = peaks[mode];
            if (!Number.isFinite(target) || !Number.isFinite(predicted) || !target)
                return;
            cost += normalizedSquaredDifference(predicted, target);
        });
        return cost;
    }
    function addDirectTargetCost(cost, desired, params, id) {
        const target = desired[id];
        const actual = params[id];
        if (!Number.isFinite(target) || !Number.isFinite(actual) || target <= 0)
            return cost;
        return cost + normalizedSquaredDifference(actual, target);
    }
    function evaluateFitCandidate(params, desired, dependencies) {
        const peaks = peaksForParams(params, dependencies);
        if (!peaks)
            return { cost: Infinity, peaks: null };
        let cost = addModeTargetCosts(0, desired, peaks);
        cost = addDirectTargetCost(cost, desired, params, "mass_top");
        cost = addDirectTargetCost(cost, desired, params, "stiffness_top");
        cost = addDirectTargetCost(cost, desired, params, "mass_back");
        cost = addDirectTargetCost(cost, desired, params, "stiffness_back");
        cost = addDirectTargetCost(cost, desired, params, "volume_air");
        cost = addDirectTargetCost(cost, desired, params, "area_hole");
        return { cost, peaks };
    }
    function initialFitStep(id) {
        if (id.startsWith("stiffness_"))
            return 0.2;
        if (id === "area_hole")
            return 0.12;
        return 0.15;
    }
    function coordinateSearch(warm, desired, tweakIds, maxIter, factorAllowed, dependencies) {
        var _a;
        let best = { ...warm };
        let bestEvaluation = evaluateFitCandidate(best, desired, dependencies);
        const steps = Object.fromEntries(tweakIds.map((id) => [id, initialFitStep(id)]));
        for (let iteration = 0; iteration < maxIter; iteration += 1) {
            let improved = false;
            for (const id of tweakIds) {
                const baseValue = best[id];
                if (!Number.isFinite(baseValue))
                    continue;
                const delta = steps[id];
                const tryFactor = (factor) => {
                    if (factorAllowed && !factorAllowed(id, factor))
                        return null;
                    const value = dependencies.clampToBounds(id, baseValue * factor);
                    const candidate = { ...best, [id]: value };
                    return { candidate, evaluation: evaluateFitCandidate(candidate, desired, dependencies) };
                };
                const plus = tryFactor(1 + delta);
                const minus = tryFactor(1 - delta);
                let next = null;
                if (plus && plus.evaluation.cost < bestEvaluation.cost)
                    next = plus;
                if (minus && minus.evaluation.cost < ((_a = next === null || next === void 0 ? void 0 : next.evaluation.cost) !== null && _a !== void 0 ? _a : bestEvaluation.cost))
                    next = minus;
                if (next) {
                    best = next.candidate;
                    bestEvaluation = next.evaluation;
                    improved = true;
                }
            }
            tweakIds.forEach((id) => {
                steps[id] *= improved ? 0.85 : 0.65;
            });
            if (Object.values(steps).every((step) => step < 0.02))
                break;
        }
        return { raw: best, evaluation: bestEvaluation };
    }
    function fitDofFromTargets(targets, options, dependencies) {
        var _a;
        const desired = desiredFitTargetsFrom(targets);
        if (!hasDesiredFitTarget(desired))
            return null;
        const baseParams = options.baseParams || dependencies.defaultParams;
        const tweakIds = options.tweakIds || Array.from(dependencies.defaultTweakIds);
        const maxIter = (_a = options.maxIter) !== null && _a !== void 0 ? _a : 12;
        const baselinePeaks = peaksForParams(baseParams, dependencies);
        const warm = warmFitParamsFrom(baseParams, desired, baselinePeaks, tweakIds, dependencies.clampToBounds);
        return coordinateSearch(warm, desired, tweakIds.slice(), maxIter, options.factorAllowed, dependencies);
    }
    function buildDofFastTargetWarmParams(input) {
        const desired = {
            air: finiteTarget(input.targets, "air"),
            top: finiteTarget(input.targets, "top"),
            back: finiteTarget(input.targets, "back"),
        };
        const warm = { ...input.baseParams };
        ["top", "back"].forEach((mode) => {
            const target = desired[mode];
            const baseline = input.peaks[mode];
            if (!Number.isFinite(target) || !Number.isFinite(baseline) || baseline <= 0)
                return;
            const ratio = target / baseline;
            const id = mode === "top" ? "stiffness_top" : "stiffness_back";
            warm[id] = input.clampToBounds(id, warm[id] * ratio * ratio);
        });
        if (Number.isFinite(desired.air) && Number.isFinite(input.peaks.air) && input.peaks.air > 0) {
            const ratio = desired.air / input.peaks.air;
            warm.volume_air = input.clampToBounds("volume_air", warm.volume_air / (ratio * ratio));
        }
        return warm;
    }
});

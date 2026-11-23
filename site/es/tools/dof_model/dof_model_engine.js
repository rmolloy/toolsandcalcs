/*
© 2025 Rick Molloy. All rights reserved.

This work extends and builds upon the acoustic-guitar modeling framework
originally developed and published by Trevor Gore and Gerard Gilet in
*Contemporary Acoustic Guitar Design and Build*. Their research established
the theoretical foundation used here. This implementation is an independent
derivative applying those principles in software form.

Permission is granted to view and reference this source code for educational
and research purposes only. Redistribution, modification, or commercial use
of this code or any derivative works is strictly prohibited without written
permission from the author.

This license supersedes all previous licensing for this repository.
*/
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./dof_display_format", "./dof_fit_input_policy", "./dof_legacy_solver", "./dof_parameter_input_policy", "./dof_peak_detection", "./dof_localized_messages", "./dof_save_summary", "./dof_target_fit"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveDofLocalizedMessages = exports.modelPeaksFromResponse = exports.dofSaveSummaryBuild = exports.dofInternalValueToDisplay = exports.dofFitTargetsHaveAnyValue = exports.dofFitSolveTweakIdsFromTargets = exports.dofDisplayValueToInternal = exports.buildDofFitInputTargets = exports.DOF_PLOT_FREQUENCY_RANGE_HZ = exports.DOF_WHAT_IF_SLIDER_RANGES = exports.DOF_WHAT_IF_RECIPE_IDS = exports.DOF_SOLVE_TWEAK_IDS = exports.DOF_FIT_BOUNDS = exports.DOF_DEFAULT_PARAMS = void 0;
    exports.dofClampToBounds = dofClampToBounds;
    exports.dofLegacySolver = dofLegacySolver;
    exports.dofPlotResponseForParams = dofPlotResponseForParams;
    exports.dofPeaksForParams = dofPeaksForParams;
    exports.dofFitWithSolver = dofFitWithSolver;
    exports.dofSolveRecipeOptions = dofSolveRecipeOptions;
    exports.dofSolveRecipeTargets = dofSolveRecipeTargets;
    exports.dofWhatIfParamsFromOverlayText = dofWhatIfParamsFromOverlayText;
    exports.dofRecipeSummaryValues = dofRecipeSummaryValues;
    // The 4DOF Model's calculation, apart from its page: the model it starts from, the bounds a fit stays
    // within, and the fit, solve and what-if steps the page's buttons run. The page and the Guitar Lab
    // connector's panel both calculate through this file.
    const dof_display_format_1 = require("./dof_display_format");
    const dof_fit_input_policy_1 = require("./dof_fit_input_policy");
    Object.defineProperty(exports, "buildDofFitInputTargets", { enumerable: true, get: function () { return dof_fit_input_policy_1.buildDofFitInputTargets; } });
    Object.defineProperty(exports, "dofFitSolveTweakIdsFromTargets", { enumerable: true, get: function () { return dof_fit_input_policy_1.dofFitSolveTweakIdsFromTargets; } });
    Object.defineProperty(exports, "dofFitTargetsHaveAnyValue", { enumerable: true, get: function () { return dof_fit_input_policy_1.dofFitTargetsHaveAnyValue; } });
    const dof_legacy_solver_1 = require("./dof_legacy_solver");
    const dof_parameter_input_policy_1 = require("./dof_parameter_input_policy");
    Object.defineProperty(exports, "dofDisplayValueToInternal", { enumerable: true, get: function () { return dof_parameter_input_policy_1.dofDisplayValueToInternal; } });
    Object.defineProperty(exports, "dofInternalValueToDisplay", { enumerable: true, get: function () { return dof_parameter_input_policy_1.dofInternalValueToDisplay; } });
    const dof_peak_detection_1 = require("./dof_peak_detection");
    Object.defineProperty(exports, "modelPeaksFromResponse", { enumerable: true, get: function () { return dof_peak_detection_1.modelPeaksFromResponse; } });
    const dof_localized_messages_1 = require("./dof_localized_messages");
    Object.defineProperty(exports, "resolveDofLocalizedMessages", { enumerable: true, get: function () { return dof_localized_messages_1.resolveDofLocalizedMessages; } });
    const dof_save_summary_1 = require("./dof_save_summary");
    Object.defineProperty(exports, "dofSaveSummaryBuild", { enumerable: true, get: function () { return dof_save_summary_1.dofSaveSummaryBuild; } });
    const dof_target_fit_1 = require("./dof_target_fit");
    exports.DOF_DEFAULT_PARAMS = {
        model_order: 4,
        ambient_temp: 20,
        altitude: 0,
        driving_force: 0.4,
        area_hole: 0.0055,
        // Masses are in kg in the solver core.
        // UI shows grams, but we convert g -> kg on input.
        mass_air: 0.0005,
        volume_air: 0.0141,
        damping_air: 0.005,
        mass_top: 0.043,
        stiffness_top: 42700,
        damping_top: 1.5,
        area_top: 0.039,
        mass_back: 0.094,
        stiffness_back: 130000,
        damping_back: 7.0,
        area_back: 0.04,
        mass_sides: 0.8,
        stiffness_sides: 1400000,
        damping_sides: 10.0,
        area_sides: 0.025,
    };
    exports.DOF_FIT_BOUNDS = {
        area_hole: { min: 0.003, max: 0.01 },
        volume_air: { min: 0.01, max: 0.025 },
        mass_top: { min: 0.005, max: 0.12 },
        stiffness_top: { min: 10000, max: 150000 },
        stiffness_back: { min: 80000, max: 400000 },
    };
    exports.DOF_SOLVE_TWEAK_IDS = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
    // Everything a recipe may change: a fit's tweaks, and the plate masses a recipe may add to.
    exports.DOF_WHAT_IF_RECIPE_IDS = [...exports.DOF_SOLVE_TWEAK_IDS, "mass_top", "mass_back"];
    // The sliders a what-if recipe moves, in the units the page shows (plate masses in grams).
    exports.DOF_WHAT_IF_SLIDER_RANGES = {
        area_hole: { step: 0.0001, min: 0.003, max: 0.01 },
        volume_air: { step: 0.0005, min: 0.01, max: 0.025 },
        stiffness_top: { step: 100, min: 10000, max: 150000 },
        stiffness_back: { step: 200, min: 80000, max: 400000 },
        mass_top: { step: 0.1, min: 5, max: 120 },
        mass_back: { step: 0.5, min: 40, max: 220 },
    };
    function dofClampToBounds(id, value) {
        const bounds = exports.DOF_FIT_BOUNDS[id];
        if (!bounds || !Number.isFinite(value))
            return value;
        return Math.max(bounds.min, Math.min(bounds.max, value));
    }
    // The solver a page has when only the solver core and the atmosphere script are loaded.
    function dofLegacySolver(runtime) {
        return {
            computeResponse: (params) => (0, dof_legacy_solver_1.computeDofLegacyResponse)(runtime, params),
            adaptParams: (raw) => (0, dof_legacy_solver_1.adaptDofLegacyParams)(runtime, raw),
        };
    }
    // The frequency range the page's response plot shows without added sources. The page keeps its own copy
    // in main.ts; its published script is held to a byte baseline.
    exports.DOF_PLOT_FREQUENCY_RANGE_HZ = [50, 300];
    // The model's total response as the page plots it: level in dB against frequency in Hz.
    function dofPlotResponseForParams(solver, raw) {
        const response = solver.computeResponse(solver.adaptParams(raw));
        return Array.isArray(response === null || response === void 0 ? void 0 : response.total) && response.total.length > 0 ? response.total : null;
    }
    function dofPeaksForParams(solver, raw) {
        const response = solver.computeResponse(solver.adaptParams(raw));
        return response ? (0, dof_peak_detection_1.modelPeaksFromResponse)(response) : null;
    }
    function dofFitWithSolver(solver, targets, options = {}) {
        return (0, dof_target_fit_1.fitDofFromTargets)(targets, options, {
            defaultParams: exports.DOF_DEFAULT_PARAMS,
            defaultTweakIds: exports.DOF_SOLVE_TWEAK_IDS,
            clampToBounds: dofClampToBounds,
            computeResponse: solver.computeResponse,
            adaptParams: solver.adaptParams,
            peaksFromResponse: dof_peak_detection_1.modelPeaksFromResponse,
        });
    }
    // What Solve Targets may change: every structural input, or only a larger soundhole and heavier plates.
    function dofSolveRecipeOptions(targets, restrictSimple) {
        return {
            tweakIds: restrictSimple ? (0, dof_fit_input_policy_1.readDofRestrictedTweakIds)() : (0, dof_fit_input_policy_1.dofFitSolveTweakIdsFromTargets)(targets),
            factorAllowed: restrictSimple ? dof_fit_input_policy_1.dofFitIncreaseOnlyFactorAllowed : undefined,
        };
    }
    // What a recipe solves for: the resonances asked for, with each resonance not asked for held where the
    // current model has it, so a recipe for one resonance does not move the others.
    function dofSolveRecipeTargets(targets, modelPeaks) {
        const held = { ...targets };
        ["air", "top", "back"].forEach((mode) => {
            if (Number.isFinite(targets[mode]))
                return;
            const peak = modelPeaks === null || modelPeaks === void 0 ? void 0 : modelPeaks[mode];
            if (Number.isFinite(peak))
                held[mode] = peak;
        });
        return held;
    }
    // The what-if model the page compares against: the current model with each what-if slider that has
    // moved off it. overlayText is each slider's value as the page's range input holds it.
    function dofWhatIfParamsFromOverlayText(base, overlayText) {
        const out = { ...base };
        let moved = false;
        exports.DOF_WHAT_IF_RECIPE_IDS.forEach((id) => {
            var _a;
            const range = exports.DOF_WHAT_IF_SLIDER_RANGES[id];
            const slider = { min: String(range.min), max: String(range.max), step: String(range.step) };
            const overlayValue = parseFloat(String((_a = overlayText[id]) !== null && _a !== void 0 ? _a : ""));
            const presentation = (0, dof_display_format_1.buildDofOverlayPresentation)({
                baseSlider: slider,
                overlaySlider: slider,
                baseValue: (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(id, base[id]),
                overlayValue,
                showWhatIf: true,
            });
            if (!presentation.isActive)
                return;
            out[id] = (0, dof_parameter_input_policy_1.dofDisplayValueToInternal)(id, overlayValue);
            moved = true;
        });
        return moved ? out : null;
    }
    // A model as the recipe summary words it: plate masses in the grams the page shows.
    function dofRecipeSummaryValues(raw) {
        if (!raw)
            return null;
        return {
            ...raw,
            mass_top: (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)("mass_top", raw.mass_top),
            mass_back: (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)("mass_back", raw.mass_back),
        };
    }
});

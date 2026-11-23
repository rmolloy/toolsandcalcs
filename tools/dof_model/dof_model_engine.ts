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

// The 4DOF Model's calculation, apart from its page: the model it starts from, the bounds a fit stays
// within, and the fit, solve and what-if steps the page's buttons run. The page and the Guitar Lab
// connector's panel both calculate through this file.

import { buildDofOverlayPresentation } from "./dof_display_format";
import {
  buildDofFitInputTargets,
  dofFitIncreaseOnlyFactorAllowed,
  dofFitSolveTweakIdsFromTargets,
  dofFitTargetsHaveAnyValue,
  readDofRestrictedTweakIds,
  type DofFitInputTargets,
} from "./dof_fit_input_policy";
import { adaptDofLegacyParams, computeDofLegacyResponse } from "./dof_legacy_solver";
import {
  dofDisplayValueToInternal,
  dofInternalValueToDisplay,
} from "./dof_parameter_input_policy";
import { modelPeaksFromResponse } from "./dof_peak_detection";
import { resolveDofLocalizedMessages } from "./dof_localized_messages";
import { dofSaveSummaryBuild } from "./dof_save_summary";
import {
  fitDofFromTargets,
  type DofFitOptions,
  type DofFitTargets,
} from "./dof_target_fit";

export type DofModelParams = {
  [key: string]: number;
};

export type DofModelSolver = {
  computeResponse: (params: Record<string, any>) => unknown;
  adaptParams: (raw: DofModelParams) => Record<string, any>;
};

type DofSliderRange = { step: number; min: number; max: number };

export const DOF_DEFAULT_PARAMS: DofModelParams = {
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

export const DOF_FIT_BOUNDS: Record<string, { min: number; max: number }> = {
  area_hole: { min: 0.003, max: 0.01 },
  volume_air: { min: 0.01, max: 0.025 },
  mass_top: { min: 0.005, max: 0.12 },
  stiffness_top: { min: 10000, max: 150000 },
  stiffness_back: { min: 80000, max: 400000 },
};

export const DOF_SOLVE_TWEAK_IDS = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"] as const;

// Everything a recipe may change: a fit's tweaks, and the plate masses a recipe may add to.
export const DOF_WHAT_IF_RECIPE_IDS = [...DOF_SOLVE_TWEAK_IDS, "mass_top", "mass_back"] as const;

// The sliders a what-if recipe moves, in the units the page shows (plate masses in grams).
export const DOF_WHAT_IF_SLIDER_RANGES: Record<typeof DOF_WHAT_IF_RECIPE_IDS[number], DofSliderRange> = {
  area_hole: { step: 0.0001, min: 0.003, max: 0.01 },
  volume_air: { step: 0.0005, min: 0.01, max: 0.025 },
  stiffness_top: { step: 100, min: 10000, max: 150000 },
  stiffness_back: { step: 200, min: 80000, max: 400000 },
  mass_top: { step: 0.1, min: 5, max: 120 },
  mass_back: { step: 0.5, min: 40, max: 220 },
};

export function dofClampToBounds(id: string, value: number) {
  const bounds = DOF_FIT_BOUNDS[id];
  if (!bounds || !Number.isFinite(value)) return value;
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

// The solver a page has when only the solver core and the atmosphere script are loaded.
export function dofLegacySolver(runtime: Record<string, any>): DofModelSolver {
  return {
    computeResponse: (params) => computeDofLegacyResponse(runtime, params),
    adaptParams: (raw) => adaptDofLegacyParams(runtime, raw),
  };
}

// The frequency range the page's response plot shows without added sources. The page keeps its own copy
// in main.ts; its published script is held to a byte baseline.
export const DOF_PLOT_FREQUENCY_RANGE_HZ: [number, number] = [50, 300];

// The model's total response as the page plots it: level in dB against frequency in Hz.
export function dofPlotResponseForParams(solver: DofModelSolver, raw: DofModelParams) {
  const response = solver.computeResponse(solver.adaptParams(raw)) as { total?: Array<{ x: number; y: number }> } | null;
  return Array.isArray(response?.total) && response.total.length > 0 ? response.total : null;
}

export function dofPeaksForParams(solver: DofModelSolver, raw: DofModelParams) {
  const response = solver.computeResponse(solver.adaptParams(raw));
  return response ? modelPeaksFromResponse(response) : null;
}

export function dofFitWithSolver(
  solver: DofModelSolver,
  targets: DofFitTargets,
  options: DofFitOptions = {},
) {
  return fitDofFromTargets(targets, options, {
    defaultParams: DOF_DEFAULT_PARAMS,
    defaultTweakIds: DOF_SOLVE_TWEAK_IDS,
    clampToBounds: dofClampToBounds,
    computeResponse: solver.computeResponse,
    adaptParams: solver.adaptParams,
    peaksFromResponse: modelPeaksFromResponse,
  });
}

// What Solve Targets may change: every structural input, or only a larger soundhole and heavier plates.
export function dofSolveRecipeOptions(targets: DofFitInputTargets, restrictSimple: boolean) {
  return {
    tweakIds: restrictSimple ? readDofRestrictedTweakIds() : dofFitSolveTweakIdsFromTargets(targets),
    factorAllowed: restrictSimple ? dofFitIncreaseOnlyFactorAllowed : undefined,
  };
}

// What a recipe solves for: the resonances asked for, with each resonance not asked for held where the
// current model has it, so a recipe for one resonance does not move the others.
export function dofSolveRecipeTargets(
  targets: DofFitInputTargets,
  modelPeaks: { air: number | null; top: number | null; back: number | null } | null,
): DofFitInputTargets {
  const held: DofFitInputTargets = { ...targets };
  (["air", "top", "back"] as const).forEach((mode) => {
    if (Number.isFinite(targets[mode])) return;
    const peak = modelPeaks?.[mode];
    if (Number.isFinite(peak)) held[mode] = peak as number;
  });
  return held;
}

// The what-if model the page compares against: the current model with each what-if slider that has
// moved off it. overlayText is each slider's value as the page's range input holds it.
export function dofWhatIfParamsFromOverlayText(
  base: DofModelParams,
  overlayText: Partial<Record<string, string>>,
): DofModelParams | null {
  const out: DofModelParams = { ...base };
  let moved = false;
  DOF_WHAT_IF_RECIPE_IDS.forEach((id) => {
    const range = DOF_WHAT_IF_SLIDER_RANGES[id];
    const slider = { min: String(range.min), max: String(range.max), step: String(range.step) };
    const overlayValue = parseFloat(String(overlayText[id] ?? ""));
    const presentation = buildDofOverlayPresentation({
      baseSlider: slider,
      overlaySlider: slider,
      baseValue: dofInternalValueToDisplay(id, base[id]),
      overlayValue,
      showWhatIf: true,
    });
    if (!presentation.isActive) return;
    out[id] = dofDisplayValueToInternal(id, overlayValue);
    moved = true;
  });
  return moved ? out : null;
}

// A model as the recipe summary words it: plate masses in the grams the page shows.
export function dofRecipeSummaryValues(raw: DofModelParams | null): DofModelParams | null {
  if (!raw) return null;
  return {
    ...raw,
    mass_top: dofInternalValueToDisplay("mass_top", raw.mass_top),
    mass_back: dofInternalValueToDisplay("mass_back", raw.mass_back),
  };
}

export {
  buildDofFitInputTargets,
  dofDisplayValueToInternal,
  dofFitSolveTweakIdsFromTargets,
  dofFitTargetsHaveAnyValue,
  dofInternalValueToDisplay,
  dofSaveSummaryBuild,
  modelPeaksFromResponse,
  resolveDofLocalizedMessages,
};

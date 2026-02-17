import type { ModeDetection } from "./resonate_mode_detection.js";
import { BASE_PARAMS } from "./resonate_fit_defaults.js";
import { overlayBoundaryDefault, type OverlayBoundary } from "./resonate_overlay_boundary.js";
import { overlayBoundaryEnsure } from "./resonate_overlay_boundary_guard.js";
import { buildMassOnlyRecipes, buildWhatIfRecipes } from "./resonate_whatif_recipes.js";
import { renderTryPanel } from "./resonate_try_panel.js";
import { ensureBaselineFitFromDetected, hasAnyTargets, normalizedWhatIfTargets } from "./resonate_target_state.js";
import { measureModeNormalize } from "./resonate_mode_config.js";

export function computeOverlayCurveFromState(
  state: Record<string, any>,
  freqs: number[],
  dbs: number[],
  modesDetected: ModeDetection[],
  overlayBoundary: OverlayBoundary = overlayBoundaryDefault,
  opts: { fitMaxIter?: number } = {},
): number[] | undefined {
  const measureMode = measureModeNormalize(state.measureMode);
  if (measureMode !== "guitar") {
    renderTryPanel([], [], false);
    return undefined;
  }
  const boundary = overlayBoundaryEnsure(overlayBoundary);
  const fitMaxIter = opts.fitMaxIter ?? 12;

  const modeTargets = state.modeTargets as Record<string, number> | undefined;
  const whatIfActive = hasAnyTargets(modeTargets);

  if (whatIfActive) {
    ensureBaselineFitFromDetected(state, modesDetected, (targets, _opts) =>
      boundary.fit4DofFromTargets(targets, { maxIter: fitMaxIter }),
    );
    const userTargets = normalizedWhatIfTargets(modeTargets);
    const targetKey = JSON.stringify({
      air: Number.isFinite(userTargets.air) ? Number((userTargets.air as number).toFixed(1)) : null,
      top: Number.isFinite(userTargets.top) ? Number((userTargets.top as number).toFixed(1)) : null,
      back: Number.isFinite(userTargets.back) ? Number((userTargets.back as number).toFixed(1)) : null,
    });
    if (state.whatIfTargetKey !== targetKey) {
      const fit = boundary.fit4DofFromTargets(userTargets, { maxIter: fitMaxIter });
      state.whatIfTargetKey = targetKey;
      state.whatIfFittedParams = fit?.raw || null;
    }
    const massKey = `${targetKey}|${String(state.lastFitTargetKey || "")}`;
    if (state.massOnlyTargetKey !== massKey) {
      const base = state.lastFittedParams || BASE_PARAMS;
      const fit = boundary.fit4DofFromTargets(userTargets, {
        maxIter: fitMaxIter,
        tweakIds: ["mass_top", "mass_back", "area_hole"],
        clampMinFromBaseIds: ["mass_top", "mass_back"],
        clampMaxFromBaseIds: ["area_hole"],
        baseParams: base,
      });
      state.massOnlyTargetKey = massKey;
      state.massOnlyFittedParams = fit?.raw || null;
    }
    const recipes = buildWhatIfRecipes(state.lastFittedParams || null, state.whatIfFittedParams || null);
    const massOnlyRecipes = buildMassOnlyRecipes(state.lastFittedParams || null, state.massOnlyFittedParams || null);
    renderTryPanel(recipes, massOnlyRecipes, true);
    if (state.whatIfFittedParams) {
      const curve = boundary.responseOverlayFromSolver(state.whatIfFittedParams, freqs);
      if (curve) return curve;
    }
    const targetModes = (Object.entries(userTargets) as any[])
      .filter(([, v]) => Number.isFinite(v))
      .map(([mode, peakFreq]) => ({ mode, peakFreq }));
    return boundary.buildOverlayFromModes(freqs, dbs, targetModes);
  }

  renderTryPanel([], [], false);
  ensureBaselineFitFromDetected(state, modesDetected, (targets, _opts) =>
    boundary.fit4DofFromTargets(targets, { maxIter: fitMaxIter }),
  );
  if (state.lastFittedParams) {
    const curve = boundary.responseOverlayFromSolver(state.lastFittedParams, freqs);
    if (curve) return curve;
  }
  return boundary.buildOverlayFromModes(freqs, dbs, modesDetected);
}

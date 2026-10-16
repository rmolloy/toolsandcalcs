import { fitModeWeightsFromDetected, fitPriorsFromState } from "./resonate_fit_priors.js?rev=ad8911223a7b";
import { BASE_PARAMS } from "./resonate_fit_defaults.js?rev=ad8911223a7b";
import { overlayBoundaryDefault } from "./resonate_overlay_boundary.js?rev=ad8911223a7b";
import { overlayBoundaryEnsure } from "./resonate_overlay_boundary_guard.js?rev=ad8911223a7b";
import { buildMassOnlyRecipes, buildWhatIfRecipes } from "./resonate_whatif_recipes.js?rev=ad8911223a7b";
import { renderTryPanel } from "./resonate_try_panel.js?rev=ad8911223a7b";
import { ensureBaselineFitFromDetected, hasAnyTargets, normalizedWhatIfTargets } from "./resonate_target_state.js?rev=ad8911223a7b";
import { measureModeNormalize } from "./resonate_mode_config.js?rev=ad8911223a7b";
export function computeOverlayCurveFromState(state, freqs, dbs, modesDetected, overlayBoundary = overlayBoundaryDefault, opts = {}) {
    const measureMode = measureModeNormalize(state.measureMode);
    if (measureMode !== "guitar") {
        renderTryPanel([], [], false);
        return undefined;
    }
    const boundary = overlayBoundaryEnsure(overlayBoundary);
    const fitMaxIter = opts.fitMaxIter ?? 12;
    const modeTargets = state.modeTargets;
    const modeWeights = fitModeWeightsFromDetected(modesDetected);
    const priors = fitPriorsFromState(state);
    const whatIfActive = hasAnyTargets(modeTargets);
    if (whatIfActive) {
        ensureBaselineFitFromDetected(state, modesDetected, (targets, _opts) => boundary.fit4DofFromTargets(targets, { maxIter: fitMaxIter, modeWeights, priors }));
        const userTargets = normalizedWhatIfTargets(modeTargets);
        const targetKey = JSON.stringify({
            air: Number.isFinite(userTargets.air) ? Number(userTargets.air.toFixed(1)) : null,
            top: Number.isFinite(userTargets.top) ? Number(userTargets.top.toFixed(1)) : null,
            back: Number.isFinite(userTargets.back) ? Number(userTargets.back.toFixed(1)) : null,
        });
        const fitKey = `${targetKey}|${String(state.lastFitTargetKey || "")}`;
        if (state.whatIfTargetKey !== fitKey) {
            const fit = boundary.fit4DofFromTargets(userTargets, { maxIter: fitMaxIter, modeWeights, priors });
            state.whatIfTargetKey = fitKey;
            state.whatIfFittedParams = fit?.raw || null;
        }
        const massKey = fitKey;
        if (state.massOnlyTargetKey !== massKey) {
            const base = state.lastFittedParams || BASE_PARAMS;
            const fit = boundary.fit4DofFromTargets(userTargets, {
                maxIter: fitMaxIter,
                modeWeights,
                priors,
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
            if (curve)
                return curve;
        }
        const targetModes = Object.entries(userTargets)
            .filter(([, v]) => Number.isFinite(v))
            .map(([mode, peakFreq]) => ({ mode, peakFreq }));
        return boundary.buildOverlayFromModes(freqs, dbs, targetModes);
    }
    inactiveWhatIfFitClearFromState(state);
    renderTryPanel([], [], false);
    ensureBaselineFitFromDetected(state, modesDetected, (targets, _opts) => boundary.fit4DofFromTargets(targets, { maxIter: fitMaxIter, modeWeights, priors }));
    if (state.lastFittedParams) {
        const curve = boundary.responseOverlayFromSolver(state.lastFittedParams, freqs);
        if (curve)
            return curve;
    }
    return boundary.buildOverlayFromModes(freqs, dbs, modesDetected);
}
function inactiveWhatIfFitClearFromState(state) {
    state.whatIfTargetKey = null;
    state.whatIfFittedParams = null;
    state.massOnlyTargetKey = null;
    state.massOnlyFittedParams = null;
}

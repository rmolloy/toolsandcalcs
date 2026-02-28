import { BASE_PARAMS, FIT_BOUNDS } from "./resonate_fit_defaults.js";
import { modeBands } from "./resonate_mode_config.js";
import { adaptParamsToSolver as adaptParamsToSolverShared, computeResponseSafe as computeResponseSafeShared, } from "../common/dof_solver_adapter.js";
function clampToBounds(id, value) {
    const b = FIT_BOUNDS[id];
    if (!b || !Number.isFinite(value))
        return value;
    return Math.max(b.min, Math.min(b.max, value));
}
export function adaptParamsToSolver(raw) {
    return adaptParamsToSolverShared(raw);
}
export function computeResponseSafe(params) {
    return computeResponseSafeShared(params);
}
function peakFreqInBand(series, band) {
    let bestX = null;
    let bestY = -Infinity;
    for (let i = 0; i < series.length; i += 1) {
        const x = series[i]?.x;
        const y = series[i]?.y;
        if (!Number.isFinite(x) || !Number.isFinite(y))
            continue;
        if (x < band.low || x > band.high)
            continue;
        if (y > bestY) {
            bestY = y;
            bestX = x;
        }
    }
    return bestX;
}
function modelPeaksFromResponse(resp) {
    const total = resp?.total;
    if (!Array.isArray(total) || !total.length)
        return null;
    return {
        air: peakFreqInBand(total, modeBands.air),
        top: peakFreqInBand(total, modeBands.top),
        back: peakFreqInBand(total, modeBands.back),
    };
}
export function fit4DofFromTargets(targets, opts = {}) {
    const maxIter = opts.maxIter ?? 12;
    const baseParams = opts.baseParams || BASE_PARAMS;
    const tweakIds = opts.tweakIds || ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
    const desired = {
        air: Number.isFinite(targets.air) ? targets.air : null,
        top: Number.isFinite(targets.top) ? targets.top : null,
        back: Number.isFinite(targets.back) ? targets.back : null,
    };
    if (!desired.air && !desired.top && !desired.back)
        return null;
    const baselineResp = computeResponseSafe(adaptParamsToSolver(baseParams));
    const baselinePeaks = baselineResp ? modelPeaksFromResponse(baselineResp) : null;
    const clampCandidate = (id, value) => {
        let out = clampToBounds(id, value);
        if (opts.clampMinFromBaseIds?.includes(id) && Number.isFinite(baseParams?.[id])) {
            out = Math.max(out, baseParams[id]);
        }
        if (opts.clampMaxFromBaseIds?.includes(id) && Number.isFinite(baseParams?.[id])) {
            out = Math.min(out, baseParams[id]);
        }
        return out;
    };
    const warm = { ...baseParams };
    if (tweakIds.includes("stiffness_top") || tweakIds.includes("stiffness_back")) {
        ["top", "back"].forEach((k) => {
            const tgt = desired[k];
            const base = baselinePeaks?.[k];
            if (Number.isFinite(tgt) && Number.isFinite(base) && base > 0) {
                const ratio = tgt / base;
                const id = k === "top" ? "stiffness_top" : "stiffness_back";
                if (tweakIds.includes(id))
                    warm[id] = clampCandidate(id, warm[id] * ratio * ratio);
            }
        });
    }
    if (tweakIds.includes("volume_air") && Number.isFinite(desired.air) && Number.isFinite(baselinePeaks?.air) && baselinePeaks.air > 0) {
        const ratio = desired.air / baselinePeaks.air;
        warm.volume_air = clampCandidate("volume_air", warm.volume_air / (ratio * ratio));
    }
    const evaluate = (rawParams) => {
        const resp = computeResponseSafe(adaptParamsToSolver(rawParams));
        const peaks = resp ? modelPeaksFromResponse(resp) : null;
        if (!peaks)
            return { err: Infinity, resp: null, peaks: null };
        const err = ["air", "top", "back"].reduce((acc, k) => {
            const tgt = desired[k];
            const val = peaks[k];
            if (!Number.isFinite(tgt) || !Number.isFinite(val))
                return acc;
            const diff = val - tgt;
            return acc + diff * diff;
        }, 0);
        return { err, resp, peaks };
    };
    let best = { ...warm };
    let bestEval = evaluate(best);
    if (!Number.isFinite(bestEval.err))
        return null;
    for (let iter = 0; iter < maxIter; iter += 1) {
        let improved = false;
        tweakIds.forEach((id) => {
            const baseVal = best[id];
            if (!Number.isFinite(baseVal))
                return;
            const step = baseVal * 0.03;
            const candidates = [baseVal + step, baseVal - step].map((v) => clampCandidate(id, v));
            candidates.forEach((v) => {
                if (!Number.isFinite(v))
                    return;
                const trial = { ...best, [id]: v };
                const evald = evaluate(trial);
                if (evald.err < bestEval.err) {
                    best = trial;
                    bestEval = evald;
                    improved = true;
                }
            });
        });
        if (!improved)
            break;
    }
    const resp = computeResponseSafe(adaptParamsToSolver(best));
    if (!resp)
        return null;
    return { raw: best, resp };
}

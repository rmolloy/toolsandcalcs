import { BASE_PARAMS, FIT_BOUNDS } from "./resonate_fit_defaults.js";
import { modeBands } from "./resonate_mode_config.js";
import {
  adaptParamsToSolver as adaptParamsToSolverShared,
  computeResponseSafe as computeResponseSafeShared,
} from "../common/dof_solver_adapter.js";

function clampToBounds(id: string, value: number) {
  const b = FIT_BOUNDS[id];
  if (!b || !Number.isFinite(value)) return value;
  return Math.max(b.min, Math.min(b.max, value));
}

export function adaptParamsToSolver(raw: Record<string, number | boolean | undefined>) {
  return adaptParamsToSolverShared(raw);
}

export function computeResponseSafe(params: Record<string, number | boolean | undefined>) {
  return computeResponseSafeShared(params);
}

type FitModeKey = "air" | "top" | "back";

export type FitPriors = {
  massCeilings?: Partial<Record<"mass_top" | "mass_back" | "mass_air" | "mass_sides", number>>;
  anchor?: Partial<Record<string, number>>;
  lambdaMassCeiling?: number;
  lambdaAnchor?: number;
};

type Fit4DofOptions = {
  maxIter?: number;
  tweakIds?: string[];
  baseParams?: Record<string, any>;
  clampMinFromBaseIds?: string[];
  clampMaxFromBaseIds?: string[];
  modeWeights?: Partial<Record<FitModeKey, number>>;
  priors?: FitPriors;
};

function peakFreqInBand(series: any[], band: { low: number; high: number }) {
  let bestX: number | null = null;
  let bestY = -Infinity;
  for (let i = 0; i < series.length; i += 1) {
    const x = series[i]?.x;
    const y = series[i]?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < band.low || x > band.high) continue;
    if (y > bestY) {
      bestY = y;
      bestX = x;
    }
  }
  return bestX;
}

function modelPeaksFromResponse(resp: any) {
  const total = resp?.total;
  if (!Array.isArray(total) || !total.length) return null;
  return {
    air: peakFreqInBand(total, modeBands.air),
    top: peakFreqInBand(total, modeBands.top),
    back: peakFreqInBand(total, modeBands.back),
  };
}

export function fit4DofFromTargets(
  targets: Record<string, number | null | undefined>,
  opts: Fit4DofOptions = {},
) {
  const maxIter = opts.maxIter ?? 12;
  const baseParams = opts.baseParams || BASE_PARAMS;
  const tweakIds = opts.tweakIds || ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
  const desired = {
    air: Number.isFinite(targets.air) ? (targets.air as number) : null,
    top: Number.isFinite(targets.top) ? (targets.top as number) : null,
    back: Number.isFinite(targets.back) ? (targets.back as number) : null,
  };
  if (!desired.air && !desired.top && !desired.back) return null;

  const modeWeights: Record<FitModeKey, number> = {
    air: Number.isFinite(opts.modeWeights?.air) ? Math.max(0.05, Number(opts.modeWeights?.air)) : 1,
    top: Number.isFinite(opts.modeWeights?.top) ? Math.max(0.05, Number(opts.modeWeights?.top)) : 1,
    back: Number.isFinite(opts.modeWeights?.back) ? Math.max(0.05, Number(opts.modeWeights?.back)) : 1,
  };

  const priors = opts.priors || {};
  const priorAnchors = priors.anchor || {};
  const priorMassCeilings = priors.massCeilings || {};
  const lambdaAnchor = Number.isFinite(priors.lambdaAnchor) ? Math.max(0, Number(priors.lambdaAnchor)) : 0.04;
  const lambdaMassCeiling = Number.isFinite(priors.lambdaMassCeiling) ? Math.max(0, Number(priors.lambdaMassCeiling)) : 0.8;

  const baselineResp = computeResponseSafe(adaptParamsToSolver(baseParams));
  const baselinePeaks = baselineResp ? modelPeaksFromResponse(baselineResp) : null;

  const clampCandidate = (id: string, value: number) => {
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
    (["top", "back"] as const).forEach((k) => {
      const tgt = desired[k];
      const base = baselinePeaks?.[k];
      if (Number.isFinite(tgt) && Number.isFinite(base) && base! > 0) {
        const ratio = (tgt as number) / (base as number);
        const id = k === "top" ? "stiffness_top" : "stiffness_back";
        if (tweakIds.includes(id)) warm[id] = clampCandidate(id, warm[id] * ratio * ratio);
      }
    });
  }
  if (tweakIds.includes("volume_air") && Number.isFinite(desired.air) && Number.isFinite(baselinePeaks?.air) && (baselinePeaks!.air as number) > 0) {
    const ratio = (desired.air as number) / (baselinePeaks!.air as number);
    warm.volume_air = clampCandidate("volume_air", warm.volume_air / (ratio * ratio));
  }

  const evaluate = (rawParams: Record<string, any>) => {
    const resp = computeResponseSafe(adaptParamsToSolver(rawParams));
    const peaks = resp ? modelPeaksFromResponse(resp) : null;
    if (!peaks) return { err: Infinity, resp: null, peaks: null };
    const targetErr = (["air", "top", "back"] as const).reduce((acc, k) => {
      const tgt = desired[k];
      const val = peaks[k];
      if (!Number.isFinite(tgt) || !Number.isFinite(val)) return acc;
      const diff = (val as number) - (tgt as number);
      return acc + (modeWeights[k] * diff * diff);
    }, 0);

    const massPenalty = (Object.entries(priorMassCeilings) as Array<[string, number]>).reduce((acc, [id, ceiling]) => {
      if (!Number.isFinite(ceiling) || ceiling <= 0) return acc;
      const current = Number(rawParams[id]);
      if (!Number.isFinite(current) || current <= ceiling) return acc;
      const excess = (current - ceiling) / ceiling;
      return acc + (excess * excess);
    }, 0);

    const anchorPenalty = (Object.entries(priorAnchors) as Array<[string, number]>).reduce((acc, [id, center]) => {
      if (!Number.isFinite(center) || center === 0) return acc;
      const current = Number(rawParams[id]);
      if (!Number.isFinite(current)) return acc;
      const norm = (current - center) / Math.abs(center);
      return acc + (norm * norm);
    }, 0);

    const err = targetErr + (lambdaMassCeiling * massPenalty) + (lambdaAnchor * anchorPenalty);
    return { err, resp, peaks };
  };

  let best = { ...warm };
  let bestEval = evaluate(best);
  if (!Number.isFinite(bestEval.err)) return null;

  for (let iter = 0; iter < maxIter; iter += 1) {
    let improved = false;
    tweakIds.forEach((id) => {
      const baseVal = best[id];
      if (!Number.isFinite(baseVal)) return;
      const step = baseVal * 0.03;
      const candidates = [baseVal + step, baseVal - step].map((v) => clampCandidate(id, v));
      candidates.forEach((v) => {
        if (!Number.isFinite(v)) return;
        const trial = { ...best, [id]: v };
        const evald = evaluate(trial);
        if (evald.err < bestEval.err) {
          best = trial;
          bestEval = evald;
          improved = true;
        }
      });
    });
    if (!improved) break;
  }

  const resp = computeResponseSafe(adaptParamsToSolver(best));
  if (!resp) return null;
  return { raw: best, resp };
}

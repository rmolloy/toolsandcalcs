export type DofFitParams = Record<string, any>;

export type DofFitPeaks = {
  air: number | null;
  top: number | null;
  back: number | null;
};

export type DofFitTargets = Record<string, number | null | undefined>;

export type DofFitOptions = {
  maxIter?: number;
  tweakIds?: string[];
  baseParams?: DofFitParams;
  factorAllowed?: (id: string, factor: number) => boolean;
};

export type DofFitDependencies = {
  defaultParams: DofFitParams;
  defaultTweakIds: readonly string[];
  clampToBounds: (id: string, value: number) => number;
  computeResponse: (params: DofFitParams) => unknown;
  adaptParams: (params: DofFitParams) => DofFitParams;
  peaksFromResponse: (response: unknown) => DofFitPeaks | null;
};

export type DofFastTargetPlanInput = {
  baseParams: DofFitParams;
  targets: DofFitTargets;
  peaks: DofFitPeaks;
  clampToBounds: (id: string, value: number) => number;
};

type DesiredFitTargets = {
  air: number | null;
  top: number | null;
  back: number | null;
  mass_top: number | null;
  stiffness_top: number | null;
  mass_back: number | null;
  stiffness_back: number | null;
  volume_air: number | null;
  area_hole: number | null;
};

type FitEvaluation = {
  cost: number;
  peaks: DofFitPeaks | null;
};

function finiteTarget(targets: DofFitTargets, key: keyof DesiredFitTargets) {
  const value = targets[key];
  return Number.isFinite(value) ? value as number : null;
}

function desiredFitTargetsFrom(targets: DofFitTargets): DesiredFitTargets {
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

function hasDesiredFitTarget(desired: DesiredFitTargets) {
  return Object.values(desired).some(Boolean);
}

function peaksForParams(
  params: DofFitParams,
  dependencies: DofFitDependencies,
) {
  const response = dependencies.computeResponse(dependencies.adaptParams(params));
  return response ? dependencies.peaksFromResponse(response) : null;
}

function warmStructuralFrequencyTargets(
  warm: DofFitParams,
  desired: DesiredFitTargets,
  baselinePeaks: DofFitPeaks | null,
  tweakIds: string[],
  clamp: (id: string, value: number) => number,
) {
  if (!tweakIds.includes("stiffness_top") && !tweakIds.includes("stiffness_back")) return;
  (["top", "back"] as const).forEach((mode) => {
    const target = desired[mode];
    const baseline = baselinePeaks?.[mode];
    if (!Number.isFinite(target) || !Number.isFinite(baseline) || (baseline as number) <= 0) return;
    const ratio = (target as number) / (baseline as number);
    const id = mode === "top" ? "stiffness_top" : "stiffness_back";
    if (tweakIds.includes(id)) warm[id] = clamp(id, warm[id] * ratio * ratio);
  });
}

function warmAirFrequencyTarget(
  warm: DofFitParams,
  desired: DesiredFitTargets,
  baselinePeaks: DofFitPeaks | null,
  tweakIds: string[],
  clamp: (id: string, value: number) => number,
) {
  if (!tweakIds.includes("volume_air")) return;
  if (!Number.isFinite(desired.air) || !Number.isFinite(baselinePeaks?.air) || (baselinePeaks!.air as number) <= 0) return;
  const ratio = (desired.air as number) / (baselinePeaks!.air as number);
  warm.volume_air = clamp("volume_air", warm.volume_air / (ratio * ratio));
}

function warmDirectTarget(
  warm: DofFitParams,
  desired: DesiredFitTargets,
  tweakIds: string[],
  id: keyof DesiredFitTargets,
  clamp: (id: string, value: number) => number,
) {
  if (!tweakIds.includes(id) || !Number.isFinite(desired[id])) return;
  warm[id] = clamp(id, desired[id] as number);
}

function warmFitParamsFrom(
  baseParams: DofFitParams,
  desired: DesiredFitTargets,
  baselinePeaks: DofFitPeaks | null,
  tweakIds: string[],
  clamp: (id: string, value: number) => number,
) {
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

function normalizedSquaredDifference(actual: number, target: number) {
  const difference = (actual - target) / target;
  return difference * difference;
}

function addModeTargetCosts(
  cost: number,
  desired: DesiredFitTargets,
  peaks: DofFitPeaks,
) {
  (["air", "top", "back"] as const).forEach((mode) => {
    const target = desired[mode];
    const predicted = peaks[mode];
    if (!Number.isFinite(target) || !Number.isFinite(predicted) || !(target as number)) return;
    cost += normalizedSquaredDifference(predicted as number, target as number);
  });
  return cost;
}

function addDirectTargetCost(
  cost: number,
  desired: DesiredFitTargets,
  params: DofFitParams,
  id: keyof DesiredFitTargets,
) {
  const target = desired[id];
  const actual = params[id];
  if (!Number.isFinite(target) || !Number.isFinite(actual) || (target as number) <= 0) return cost;
  return cost + normalizedSquaredDifference(actual, target as number);
}

function evaluateFitCandidate(
  params: DofFitParams,
  desired: DesiredFitTargets,
  dependencies: DofFitDependencies,
): FitEvaluation {
  const peaks = peaksForParams(params, dependencies);
  if (!peaks) return { cost: Infinity, peaks: null };
  let cost = addModeTargetCosts(0, desired, peaks);
  cost = addDirectTargetCost(cost, desired, params, "mass_top");
  cost = addDirectTargetCost(cost, desired, params, "stiffness_top");
  cost = addDirectTargetCost(cost, desired, params, "mass_back");
  cost = addDirectTargetCost(cost, desired, params, "stiffness_back");
  cost = addDirectTargetCost(cost, desired, params, "volume_air");
  cost = addDirectTargetCost(cost, desired, params, "area_hole");
  return { cost, peaks };
}

function initialFitStep(id: string) {
  if (id.startsWith("stiffness_")) return 0.2;
  if (id === "area_hole") return 0.12;
  return 0.15;
}

function coordinateSearch(
  warm: DofFitParams,
  desired: DesiredFitTargets,
  tweakIds: string[],
  maxIter: number,
  factorAllowed: DofFitOptions["factorAllowed"],
  dependencies: DofFitDependencies,
) {
  let best = { ...warm };
  let bestEvaluation = evaluateFitCandidate(best, desired, dependencies);
  const steps = Object.fromEntries(tweakIds.map((id) => [id, initialFitStep(id)]));

  for (let iteration = 0; iteration < maxIter; iteration += 1) {
    let improved = false;
    for (const id of tweakIds) {
      const baseValue = best[id];
      if (!Number.isFinite(baseValue)) continue;
      const delta = steps[id];
      const tryFactor = (factor: number) => {
        if (factorAllowed && !factorAllowed(id, factor)) return null;
        const value = dependencies.clampToBounds(id, baseValue * factor);
        const candidate = { ...best, [id]: value };
        return { candidate, evaluation: evaluateFitCandidate(candidate, desired, dependencies) };
      };
      const plus = tryFactor(1 + delta);
      const minus = tryFactor(1 - delta);
      let next = null;
      if (plus && plus.evaluation.cost < bestEvaluation.cost) next = plus;
      if (minus && minus.evaluation.cost < (next?.evaluation.cost ?? bestEvaluation.cost)) next = minus;
      if (next) {
        best = next.candidate;
        bestEvaluation = next.evaluation;
        improved = true;
      }
    }
    tweakIds.forEach((id) => {
      steps[id] *= improved ? 0.85 : 0.65;
    });
    if (Object.values(steps).every((step) => step < 0.02)) break;
  }

  return { raw: best, evaluation: bestEvaluation };
}

export function fitDofFromTargets(
  targets: DofFitTargets,
  options: DofFitOptions,
  dependencies: DofFitDependencies,
) {
  const desired = desiredFitTargetsFrom(targets);
  if (!hasDesiredFitTarget(desired)) return null;
  const baseParams = options.baseParams || dependencies.defaultParams;
  const tweakIds = options.tweakIds || Array.from(dependencies.defaultTweakIds);
  const maxIter = options.maxIter ?? 12;
  const baselinePeaks = peaksForParams(baseParams, dependencies);
  const warm = warmFitParamsFrom(
    baseParams,
    desired,
    baselinePeaks,
    tweakIds,
    dependencies.clampToBounds,
  );
  return coordinateSearch(
    warm,
    desired,
    tweakIds.slice(),
    maxIter,
    options.factorAllowed,
    dependencies,
  );
}

export function buildDofFastTargetWarmParams(input: DofFastTargetPlanInput) {
  const desired = {
    air: finiteTarget(input.targets, "air"),
    top: finiteTarget(input.targets, "top"),
    back: finiteTarget(input.targets, "back"),
  };
  const warm = { ...input.baseParams };
  (["top", "back"] as const).forEach((mode) => {
    const target = desired[mode];
    const baseline = input.peaks[mode];
    if (!Number.isFinite(target) || !Number.isFinite(baseline) || (baseline as number) <= 0) return;
    const ratio = (target as number) / (baseline as number);
    const id = mode === "top" ? "stiffness_top" : "stiffness_back";
    warm[id] = input.clampToBounds(id, warm[id] * ratio * ratio);
  });
  if (Number.isFinite(desired.air) && Number.isFinite(input.peaks.air) && (input.peaks.air as number) > 0) {
    const ratio = (desired.air as number) / (input.peaks.air as number);
    warm.volume_air = input.clampToBounds(
      "volume_air",
      warm.volume_air / (ratio * ratio),
    );
  }
  return warm;
}

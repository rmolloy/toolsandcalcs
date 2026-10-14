import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

function recipeSoundholeDeltaMm(area0: number, area1: number): number | null {
  if (!Number.isFinite(area0) || !Number.isFinite(area1) || area0 <= 0 || area1 <= 0) return null;
  const d0 = 2 * Math.sqrt(area0 / Math.PI);
  const d1 = 2 * Math.sqrt(area1 / Math.PI);
  return (d1 - d0) * 1000;
}

function recipePercentDelta(v0: number, v1: number): number | null {
  if (!Number.isFinite(v0) || !Number.isFinite(v1) || v0 === 0) return null;
  return ((v1 - v0) / v0) * 100;
}

function massDeltaGrams(g0: number, g1: number): number | null {
  if (!Number.isFinite(g0) || !Number.isFinite(g1)) return null;
  return g1 - g0;
}

const MASS_ONLY_SOUNDPHOLE_REDUCTION_MAX_MM = 1;

function massOnlySoundholeReductionMmResolve(deltaMm: number) {
  return Math.min(Math.abs(deltaMm), MASS_ONLY_SOUNDPHOLE_REDUCTION_MAX_MM);
}

export function buildWhatIfRecipes(baseline: Record<string, any> | null, whatIf: Record<string, any> | null): string[] {
  if (!baseline || !whatIf) return [];
  const out: string[] = [];

  const soundholeRecipe = buildSoundholeRecipeFromStates(baseline, whatIf);
  if (soundholeRecipe) out.push(soundholeRecipe);

  const airVolumeRecipe = buildAirVolumeRecipeFromStates(baseline, whatIf);
  if (airVolumeRecipe) out.push(airVolumeRecipe);

  const topStiffnessRecipe = buildTopStiffnessRecipeFromStates(baseline, whatIf);
  if (topStiffnessRecipe) out.push(topStiffnessRecipe);

  const backStiffnessRecipe = buildBackStiffnessRecipeFromStates(baseline, whatIf);
  if (backStiffnessRecipe) out.push(backStiffnessRecipe);

  return out;
}

function buildSoundholeRecipeFromStates(
  baseline: Record<string, any>,
  whatIf: Record<string, any>,
) {
  const diameterDeltaMm = recipeSoundholeDeltaMm(
    baseline.area_hole,
    whatIf.area_hole,
  );
  if (!Number.isFinite(diameterDeltaMm) || Math.abs(diameterDeltaMm as number) < 0.2) {
    return null;
  }
  const amountMm = Math.abs(diameterDeltaMm as number).toFixed(1);
  const template = (diameterDeltaMm as number) < 0
    ? resonanceLocalizedMessages.whatIfSoundholeReduceTemplate
    : resonanceLocalizedMessages.whatIfSoundholeIncreaseTemplate;
  return template.replace("{amountMm}", amountMm);
}

function buildAirVolumeRecipeFromStates(
  baseline: Record<string, any>,
  whatIf: Record<string, any>,
) {
  const volumeDeltaPercent = recipePercentDelta(
    baseline.volume_air,
    whatIf.volume_air,
  );
  if (!Number.isFinite(volumeDeltaPercent) || Math.abs(volumeDeltaPercent as number) < 2) {
    return null;
  }
  const amountPercent = Math.abs(volumeDeltaPercent as number).toFixed(0);
  const template = (volumeDeltaPercent as number) < 0
    ? resonanceLocalizedMessages.whatIfAirVolumeReduceTemplate
    : resonanceLocalizedMessages.whatIfAirVolumeIncreaseTemplate;
  return template.replace("{amountPercent}", amountPercent);
}

function buildTopStiffnessRecipeFromStates(
  baseline: Record<string, any>,
  whatIf: Record<string, any>,
) {
  const stiffnessDeltaPercent = recipePercentDelta(
    baseline.stiffness_top,
    whatIf.stiffness_top,
  );
  if (!Number.isFinite(stiffnessDeltaPercent) || Math.abs(stiffnessDeltaPercent as number) < 5) {
    return null;
  }
  const amountPercent = Math.abs(stiffnessDeltaPercent as number).toFixed(0);
  const template = (stiffnessDeltaPercent as number) < 0
    ? resonanceLocalizedMessages.whatIfTopStiffnessSoftenTemplate
    : resonanceLocalizedMessages.whatIfTopStiffnessStiffenTemplate;
  return template.replace("{amountPercent}", amountPercent);
}

function buildBackStiffnessRecipeFromStates(
  baseline: Record<string, any>,
  whatIf: Record<string, any>,
) {
  const stiffnessDeltaPercent = recipePercentDelta(
    baseline.stiffness_back,
    whatIf.stiffness_back,
  );
  if (!Number.isFinite(stiffnessDeltaPercent) || Math.abs(stiffnessDeltaPercent as number) < 5) {
    return null;
  }
  const amountPercent = Math.abs(stiffnessDeltaPercent as number).toFixed(0);
  const template = (stiffnessDeltaPercent as number) < 0
    ? resonanceLocalizedMessages.whatIfBackStiffnessSoftenTemplate
    : resonanceLocalizedMessages.whatIfBackStiffnessStiffenTemplate;
  return template.replace("{amountPercent}", amountPercent);
}

export function buildMassOnlyRecipes(baseline: Record<string, any> | null, massOnly: Record<string, any> | null): string[] {
  if (!baseline || !massOnly) return [];
  const out: string[] = [];
  const soundholeRecipe = buildMassOnlySoundholeRecipeFromStates(baseline, massOnly);
  if (soundholeRecipe) out.push(soundholeRecipe);
  const topMassRecipe = buildTopMassRecipeFromStates(baseline, massOnly);
  if (topMassRecipe) out.push(topMassRecipe);
  const backMassRecipe = buildBackMassRecipeFromStates(baseline, massOnly);
  if (backMassRecipe) out.push(backMassRecipe);
  return out;
}

function buildMassOnlySoundholeRecipeFromStates(
  baseline: Record<string, any>,
  massOnly: Record<string, any>,
) {
  const diameterDeltaMm = recipeSoundholeDeltaMm(
    baseline.area_hole,
    massOnly.area_hole,
  );
  if (!Number.isFinite(diameterDeltaMm) || (diameterDeltaMm as number) >= -0.2) {
    return null;
  }
  const reductionMm = massOnlySoundholeReductionMmResolve(diameterDeltaMm as number);
  return resonanceLocalizedMessages.whatIfSoundholeReduceTemplate.replace(
    "{amountMm}",
    reductionMm.toFixed(1),
  );
}

function buildTopMassRecipeFromStates(
  baseline: Record<string, any>,
  massOnly: Record<string, any>,
) {
  const massDeltaG = massDeltaGrams(baseline.mass_top, massOnly.mass_top);
  if (!Number.isFinite(massDeltaG) || (massDeltaG as number) <= 0.2) return null;
  return resonanceLocalizedMessages.whatIfTopMassTemplate.replace(
    "{massG}",
    (massDeltaG as number).toFixed(1),
  );
}

function buildBackMassRecipeFromStates(
  baseline: Record<string, any>,
  massOnly: Record<string, any>,
) {
  const massDeltaG = massDeltaGrams(baseline.mass_back, massOnly.mass_back);
  if (!Number.isFinite(massDeltaG) || (massDeltaG as number) <= 0.2) return null;
  return resonanceLocalizedMessages.whatIfBackMassTemplate.replace(
    "{massG}",
    (massDeltaG as number).toFixed(1),
  );
}

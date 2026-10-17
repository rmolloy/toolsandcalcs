import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=de0830708801";
function recipeSoundholeDeltaMm(area0, area1) {
    if (!Number.isFinite(area0) || !Number.isFinite(area1) || area0 <= 0 || area1 <= 0)
        return null;
    const d0 = 2 * Math.sqrt(area0 / Math.PI);
    const d1 = 2 * Math.sqrt(area1 / Math.PI);
    return (d1 - d0) * 1000;
}
function recipePercentDelta(v0, v1) {
    if (!Number.isFinite(v0) || !Number.isFinite(v1) || v0 === 0)
        return null;
    return ((v1 - v0) / v0) * 100;
}
function massDeltaGrams(g0, g1) {
    if (!Number.isFinite(g0) || !Number.isFinite(g1))
        return null;
    return g1 - g0;
}
const MASS_ONLY_SOUNDPHOLE_REDUCTION_MAX_MM = 1;
function massOnlySoundholeReductionMmResolve(deltaMm) {
    return Math.min(Math.abs(deltaMm), MASS_ONLY_SOUNDPHOLE_REDUCTION_MAX_MM);
}
export function buildWhatIfRecipes(baseline, whatIf) {
    if (!baseline || !whatIf)
        return [];
    const out = [];
    const soundholeRecipe = buildSoundholeRecipeFromStates(baseline, whatIf);
    if (soundholeRecipe)
        out.push(soundholeRecipe);
    const airVolumeRecipe = buildAirVolumeRecipeFromStates(baseline, whatIf);
    if (airVolumeRecipe)
        out.push(airVolumeRecipe);
    const topStiffnessRecipe = buildTopStiffnessRecipeFromStates(baseline, whatIf);
    if (topStiffnessRecipe)
        out.push(topStiffnessRecipe);
    const backStiffnessRecipe = buildBackStiffnessRecipeFromStates(baseline, whatIf);
    if (backStiffnessRecipe)
        out.push(backStiffnessRecipe);
    return out;
}
function buildSoundholeRecipeFromStates(baseline, whatIf) {
    const diameterDeltaMm = recipeSoundholeDeltaMm(baseline.area_hole, whatIf.area_hole);
    if (!Number.isFinite(diameterDeltaMm) || Math.abs(diameterDeltaMm) < 0.2) {
        return null;
    }
    const amountMm = Math.abs(diameterDeltaMm).toFixed(1);
    const template = diameterDeltaMm < 0
        ? resonanceLocalizedMessages.whatIfSoundholeReduceTemplate
        : resonanceLocalizedMessages.whatIfSoundholeIncreaseTemplate;
    return template.replace("{amountMm}", amountMm);
}
function buildAirVolumeRecipeFromStates(baseline, whatIf) {
    const volumeDeltaPercent = recipePercentDelta(baseline.volume_air, whatIf.volume_air);
    if (!Number.isFinite(volumeDeltaPercent) || Math.abs(volumeDeltaPercent) < 2) {
        return null;
    }
    const amountPercent = Math.abs(volumeDeltaPercent).toFixed(0);
    const template = volumeDeltaPercent < 0
        ? resonanceLocalizedMessages.whatIfAirVolumeReduceTemplate
        : resonanceLocalizedMessages.whatIfAirVolumeIncreaseTemplate;
    return template.replace("{amountPercent}", amountPercent);
}
function buildTopStiffnessRecipeFromStates(baseline, whatIf) {
    const stiffnessDeltaPercent = recipePercentDelta(baseline.stiffness_top, whatIf.stiffness_top);
    if (!Number.isFinite(stiffnessDeltaPercent) || Math.abs(stiffnessDeltaPercent) < 5) {
        return null;
    }
    const amountPercent = Math.abs(stiffnessDeltaPercent).toFixed(0);
    const template = stiffnessDeltaPercent < 0
        ? resonanceLocalizedMessages.whatIfTopStiffnessSoftenTemplate
        : resonanceLocalizedMessages.whatIfTopStiffnessStiffenTemplate;
    return template.replace("{amountPercent}", amountPercent);
}
function buildBackStiffnessRecipeFromStates(baseline, whatIf) {
    const stiffnessDeltaPercent = recipePercentDelta(baseline.stiffness_back, whatIf.stiffness_back);
    if (!Number.isFinite(stiffnessDeltaPercent) || Math.abs(stiffnessDeltaPercent) < 5) {
        return null;
    }
    const amountPercent = Math.abs(stiffnessDeltaPercent).toFixed(0);
    const template = stiffnessDeltaPercent < 0
        ? resonanceLocalizedMessages.whatIfBackStiffnessSoftenTemplate
        : resonanceLocalizedMessages.whatIfBackStiffnessStiffenTemplate;
    return template.replace("{amountPercent}", amountPercent);
}
export function buildMassOnlyRecipes(baseline, massOnly) {
    if (!baseline || !massOnly)
        return [];
    const out = [];
    const soundholeRecipe = buildMassOnlySoundholeRecipeFromStates(baseline, massOnly);
    if (soundholeRecipe)
        out.push(soundholeRecipe);
    const topMassRecipe = buildTopMassRecipeFromStates(baseline, massOnly);
    if (topMassRecipe)
        out.push(topMassRecipe);
    const backMassRecipe = buildBackMassRecipeFromStates(baseline, massOnly);
    if (backMassRecipe)
        out.push(backMassRecipe);
    return out;
}
function buildMassOnlySoundholeRecipeFromStates(baseline, massOnly) {
    const diameterDeltaMm = recipeSoundholeDeltaMm(baseline.area_hole, massOnly.area_hole);
    if (!Number.isFinite(diameterDeltaMm) || diameterDeltaMm >= -0.2) {
        return null;
    }
    const reductionMm = massOnlySoundholeReductionMmResolve(diameterDeltaMm);
    return resonanceLocalizedMessages.whatIfSoundholeReduceTemplate.replace("{amountMm}", reductionMm.toFixed(1));
}
function buildTopMassRecipeFromStates(baseline, massOnly) {
    const massDeltaG = massDeltaGrams(baseline.mass_top, massOnly.mass_top);
    if (!Number.isFinite(massDeltaG) || massDeltaG <= 0.2)
        return null;
    return resonanceLocalizedMessages.whatIfTopMassTemplate.replace("{massG}", massDeltaG.toFixed(1));
}
function buildBackMassRecipeFromStates(baseline, massOnly) {
    const massDeltaG = massDeltaGrams(baseline.mass_back, massOnly.mass_back);
    if (!Number.isFinite(massDeltaG) || massDeltaG <= 0.2)
        return null;
    return resonanceLocalizedMessages.whatIfBackMassTemplate.replace("{massG}", massDeltaG.toFixed(1));
}

import { BASE_PARAMS } from "./resonate_fit_defaults.js";
export function fitModeWeightsFromDetected(modesDetected) {
    const byMode = new Map();
    modesDetected.forEach((mode) => byMode.set(mode.mode, mode));
    const weightFor = (key) => {
        const prominence = Number(byMode.get(key)?.prominenceDb);
        if (!Number.isFinite(prominence))
            return 1;
        // Confidence weighting by prominence; 6 dB ~= strong local evidence.
        return Math.max(0.2, Math.min(2.2, 0.6 + (prominence / 6)));
    };
    return {
        air: weightFor("air"),
        top: weightFor("top"),
        back: weightFor("back"),
    };
}
export function fitPriorsFromState(state) {
    const measuredMasses = state.fittedMassCeilings;
    const ceilings = {
        mass_top: Number.isFinite(measuredMasses?.mass_top) ? Number(measuredMasses?.mass_top) : Number(BASE_PARAMS.mass_top),
        mass_back: Number.isFinite(measuredMasses?.mass_back) ? Number(measuredMasses?.mass_back) : Number(BASE_PARAMS.mass_back),
    };
    return {
        massCeilings: ceilings,
        anchor: {
            stiffness_top: Number(BASE_PARAMS.stiffness_top),
            stiffness_back: Number(BASE_PARAMS.stiffness_back),
            volume_air: Number(BASE_PARAMS.volume_air),
            area_hole: Number(BASE_PARAMS.area_hole),
        },
        lambdaMassCeiling: 0.7,
        lambdaAnchor: 0.05,
    };
}

import { resonanceSpectrumDbScaleResolve } from "./resonate_debug_flags.js";
export function spectrumDbApply(spectrum, legacyApplyDb) {
    if (resonanceSpectrumDbScaleResolve() === "celestial-fixed") {
        return celestialSpectrumDbApply(spectrum);
    }
    return legacyApplyDb(spectrum);
}
export function celestialSpectrumDbApply(spectrum) {
    const dbs = spectrum.mags.map((magnitude) => Math.max(20 * Math.log10(Math.max(magnitude, 1e-10)), -100));
    return {
        ...spectrum,
        dbs,
        maxDb: Math.max(...dbs, -100),
        floorDb: -100,
    };
}

import { resonanceSpectrumDisplayRangeResolve } from "./resonate_debug_flags.js";
export const FREQ_MIN = 50;
export const FREQ_AXIS_MAX = 500;
export const FFT_MAX_HZ = 2000;
export const CELESTIAL_FREQ_MIN = 20;
export const CELESTIAL_FREQ_AXIS_MAX = 1000;
export const CELESTIAL_FFT_MAX_HZ = 1000;
export function spectrumViewRangeResolveFromMeasureMode(measureMode) {
    if (resonanceSpectrumDisplayRangeResolve() === "celestial") {
        return { freqMin: CELESTIAL_FREQ_MIN, freqAxisMax: CELESTIAL_FREQ_AXIS_MAX };
    }
    if (measureMode === "plate_stock" || measureMode === "top" || measureMode === "back" || measureMode === "brace_stock") {
        return { freqMin: 25, freqAxisMax: 200 };
    }
    return { freqMin: FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
}
export function spectrumFftMaxHzResolve() {
    if (resonanceSpectrumDisplayRangeResolve() === "celestial")
        return CELESTIAL_FFT_MAX_HZ;
    return FFT_MAX_HZ;
}

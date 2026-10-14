import { resonanceSpectrumDisplayRangeResolve } from "./resonate_debug_flags.js";
export const FREQ_MIN = 50;
export const FREQ_AXIS_MAX = 500;
export const FFT_MAX_HZ = 2000;
export const CELESTIAL_FREQ_MIN = 20;
export const CELESTIAL_FREQ_AXIS_MAX = 1000;
export const CELESTIAL_FFT_MAX_HZ = 1000;
export const STOCK_FREQ_MIN = 25;
export const STOCK_FREQ_AXIS_MAX = 200;
export const BRACE_STOCK_FREQ_MIN = 100;
export function spectrumViewRangeResolveFromMeasureMode(measureMode) {
    if (resonanceSpectrumDisplayRangeResolve() === "celestial") {
        return { freqMin: CELESTIAL_FREQ_MIN, freqAxisMax: CELESTIAL_FREQ_AXIS_MAX };
    }
    if (measureModeUsesBraceStockFrequencyRange(measureMode)) {
        return { freqMin: BRACE_STOCK_FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
    }
    if (measureModeUsesPlateStockFrequencyRange(measureMode)) {
        return { freqMin: STOCK_FREQ_MIN, freqAxisMax: STOCK_FREQ_AXIS_MAX };
    }
    return { freqMin: FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
}
function measureModeUsesPlateStockFrequencyRange(measureMode) {
    return measureMode === "plate_stock" || measureMode === "top";
}
function measureModeUsesBraceStockFrequencyRange(measureMode) {
    return measureMode === "back" || measureMode === "brace_stock";
}
export function spectrumFftMaxHzResolve() {
    if (resonanceSpectrumDisplayRangeResolve() === "celestial")
        return CELESTIAL_FFT_MAX_HZ;
    return FFT_MAX_HZ;
}

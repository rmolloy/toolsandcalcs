export const FREQ_MIN = 50;
export const FREQ_AXIS_MAX = 500;
export const FFT_MAX_HZ = 2000;
export function spectrumViewRangeResolveFromMeasureMode(measureMode) {
    if (measureMode === "plate_stock" || measureMode === "top" || measureMode === "back" || measureMode === "brace_stock") {
        return { freqMin: 25, freqAxisMax: 200 };
    }
    return { freqMin: FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
}

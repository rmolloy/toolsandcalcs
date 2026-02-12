export const FREQ_MIN = 50;
export const FREQ_AXIS_MAX = 500;
export const FFT_MAX_HZ = 2000;

export function spectrumViewRangeResolveFromMeasureMode(measureMode: unknown): { freqMin: number; freqAxisMax: number } {
  if (measureMode === "top" || measureMode === "back") {
    return { freqMin: 25, freqAxisMax: 200 };
  }
  return { freqMin: FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
}

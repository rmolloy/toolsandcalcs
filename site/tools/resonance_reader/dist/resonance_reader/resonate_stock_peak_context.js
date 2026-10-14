import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js?rev=88a3838e0e5a";
import { stockKindResolve } from "./resonate_stock_measurements.js?rev=88a3838e0e5a";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=88a3838e0e5a";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=88a3838e0e5a";
export function stockPeakContextDiffers(state) {
    const kind = stockKindResolve(state);
    return state.measureMode === "peak_analysis" && Boolean(kind && kind !== peakAnalysisSourceMeasureModeResolve(state));
}
export function stockPeakLabelsForSpecimen(state, peaks) {
    if (!stockPeakContextDiffers(state))
        return peaks;
    const frequency = stockLongConfirmationResolve(state)?.frequencyHz;
    return peaks.map(peak => ({ ...peak, label: stockPeakLabelBuild(peak.freq, frequency) }));
}
function stockPeakLabelBuild(peakHz, confirmedHz) {
    if (Number.isFinite(peakHz) && Number.isFinite(confirmedHz) && Math.abs(Number(peakHz) - Number(confirmedHz)) < 0.05) {
        return resonanceLocalizedMessages.modeCardsConfirmedLong;
    }
    return resonanceLocalizedMessages.stockPeakLabel;
}

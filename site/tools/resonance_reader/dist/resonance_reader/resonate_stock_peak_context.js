import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js?rev=dae658f6289e";
import { stockKindResolve } from "./resonate_stock_measurements.js?rev=dae658f6289e";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=dae658f6289e";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=dae658f6289e";
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

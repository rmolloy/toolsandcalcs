import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js?rev=093b6a20873d";
import { stockKindResolve } from "./resonate_stock_measurements.js?rev=093b6a20873d";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js?rev=093b6a20873d";
export function stockLongAssignedModeResolve(state) {
    if (stockKindResolve(state) !== peakAnalysisSourceMeasureModeResolve(state))
        return undefined;
    return stockLongAssignmentBuildFromCard(state, stockLongCardRead(state));
}
function stockLongCardRead(state) {
    const card = state.lastModeCards?.find((mode) => mode.key === "long");
    if (card)
        return { key: card.key, freq: card.freq };
    return stockLongCardBuildFromDetection(state);
}
function stockLongCardBuildFromDetection(state) {
    const detection = state.lastModesDetected?.find((mode) => mode.mode === "long");
    return detection ? { key: "long", freq: detection.peakFreq } : null;
}
function stockLongAssignmentBuildFromCard(state, card) {
    if (!card)
        return undefined;
    return braceStockLongModeConfirmationBuild({
        peakKey: card.key, frequencyHz: card.freq,
        tapIndex: state.peakAnalysisSelectedTapIndex, sourceLabel: state.recordingLabel,
    });
}

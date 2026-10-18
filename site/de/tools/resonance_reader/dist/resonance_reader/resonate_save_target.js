import { readOfflineDownloadSaveSurface } from "../common/offline_save_surface.js?rev=2c871654a0c5";
import { downloadResonanceWave } from "./resonate_save_package_download.js?rev=2c871654a0c5";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=2c871654a0c5";
export function resonanceSaveRunnerCreate() {
    return {
        readResonanceSaveSurface,
        runResonanceSaveAction,
    };
}
async function readResonanceSaveSurface() {
    return readOfflineDownloadSaveSurface({
        label: resonanceLocalizedMessages.saveActionLabel,
        hint: resonanceLocalizedMessages.saveWavHint,
    });
}
async function runResonanceSaveAction(request) {
    if (!hasWaveformCapture()) {
        request.setStatus(resonanceLocalizedMessages.saveLoadFirstStatus);
        return false;
    }
    downloadResonanceWave({
        state: request.state,
        recordingLabel: resonanceCaptureRecordingLabelRead(request.state),
    });
    request.setStatus(resonanceLocalizedMessages.saveWavSavedStatus);
    return true;
}
function hasWaveformCapture() {
    return Boolean(window.FFTState?.currentWave);
}
function resonanceCaptureRecordingLabelRead(state) {
    return String(state.recordingLabel || document.getElementById("take_overlay_menu")?.textContent || "resonance-capture");
}

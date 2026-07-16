import { readOfflineDownloadSaveSurface } from "../common/offline_save_surface.js";
import { downloadResonanceWave } from "./resonate_save_package_download.js";
export function resonanceSaveRunnerCreate() {
    return {
        readResonanceSaveSurface,
        runResonanceSaveAction,
    };
}
async function readResonanceSaveSurface() {
    return readOfflineDownloadSaveSurface({
        label: "Save",
        hint: "Save the current WAV file locally.",
    });
}
async function runResonanceSaveAction(request) {
    if (!hasWaveformCapture()) {
        request.setStatus("Load or record before saving.");
        return false;
    }
    downloadResonanceWave({
        state: request.state,
        recordingLabel: resonanceCaptureRecordingLabelRead(request.state),
    });
    request.setStatus("WAV saved.");
    return true;
}
function hasWaveformCapture() {
    return Boolean(window.FFTState?.currentWave);
}
function resonanceCaptureRecordingLabelRead(state) {
    return String(state.recordingLabel || document.getElementById("recording_select")?.textContent || "resonance-capture");
}

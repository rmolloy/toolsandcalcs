import { readOfflineDownloadSaveSurface } from "../common/offline_save_surface.js";
import { downloadResonanceCapturePackage } from "./resonate_save_package_download.js";
export function resonanceSaveRunnerCreate() {
    return {
        readResonanceSaveSurface,
        runResonanceSaveAction,
    };
}
async function readResonanceSaveSurface() {
    return readOfflineDownloadSaveSurface({
        label: "Download Package",
        hint: "Notebook saving is not available here. Download the package instead.",
    });
}
async function runResonanceSaveAction(request) {
    if (!hasWaveformCapture()) {
        request.setStatus("Load or record before saving.");
        return false;
    }
    await downloadResonanceCapturePackage({
        state: request.state,
        recordingLabel: resonanceCaptureRecordingLabelRead(request.state),
        plotElement: document.getElementById("plot_fft"),
    });
    request.setStatus("Package downloaded.");
    return true;
}
function hasWaveformCapture() {
    return Boolean(window.FFTState?.currentWave);
}
function resonanceCaptureRecordingLabelRead(state) {
    return String(state.recordingLabel || document.getElementById("recording_select")?.textContent || "resonance-capture");
}

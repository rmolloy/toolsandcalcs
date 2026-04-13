import type {
  ResonanceSaveActionRequest,
  ResonanceSaveActionRunner,
  ResonanceSaveSurface,
} from "./resonate_save_contract.js";
import { readOfflineDownloadSaveSurface } from "../common/offline_save_surface.js";
import { downloadResonanceCapturePackage } from "./resonate_save_package_download.js";

export function resonanceSaveRunnerCreate(): ResonanceSaveActionRunner {
  return {
    readResonanceSaveSurface,
    runResonanceSaveAction,
  };
}

async function readResonanceSaveSurface(): Promise<ResonanceSaveSurface> {
  return readOfflineDownloadSaveSurface({
    label: "Download Package",
    hint: "Notebook saving is not available here. Download the package instead.",
  });
}

async function runResonanceSaveAction(request: ResonanceSaveActionRequest): Promise<boolean> {
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

function hasWaveformCapture(): boolean {
  return Boolean((window as any).FFTState?.currentWave);
}

function resonanceCaptureRecordingLabelRead(state: Record<string, any>): string {
  return String(state.recordingLabel || document.getElementById("recording_select")?.textContent || "resonance-capture");
}

import type {
  ResonanceSaveActionRequest,
  ResonanceSaveActionRunner,
  ResonanceSaveSurface,
} from "./resonate_save_contract.js";
import { readOfflineDownloadSaveSurface } from "../common/offline_save_surface.js";
import { downloadResonanceWave } from "./resonate_save_package_download.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export function resonanceSaveRunnerCreate(): ResonanceSaveActionRunner {
  return {
    readResonanceSaveSurface,
    runResonanceSaveAction,
  };
}

async function readResonanceSaveSurface(): Promise<ResonanceSaveSurface> {
  return readOfflineDownloadSaveSurface({
    label: resonanceLocalizedMessages.saveActionLabel,
    hint: resonanceLocalizedMessages.saveWavHint,
  });
}

async function runResonanceSaveAction(request: ResonanceSaveActionRequest): Promise<boolean> {
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

function hasWaveformCapture(): boolean {
  return Boolean((window as any).FFTState?.currentWave);
}

function resonanceCaptureRecordingLabelRead(state: Record<string, any>): string {
  return String(state.recordingLabel || document.getElementById("take_overlay_menu")?.textContent || "resonance-capture");
}

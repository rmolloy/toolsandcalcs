import { recordingMenuLabelSet } from "./resonate_recording_menu.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";
import {
  takeOverlayCaptureCurrentAndRender,
  takeOverlayControlsRender,
} from "./resonate_take_overlay_controls.js";
import { takeOverlayPrepareNewCurrentState } from "./resonate_take_overlays.js";
import { updateWaveTransportLabels } from "./resonate_transport_labels.js";
import type { UiBindingsDeps } from "./resonate_ui_bindings_contract.js";

export function bindRecord(deps: UiBindingsDeps) {
  const button = document.getElementById("btn_record");
  if (!button) return;
  button.addEventListener("click", () => {
    recordToggleFromMic(deps);
  });
}

export function recordToggleFromMic(deps: UiBindingsDeps) {
  const FFTAudio = (window as any).FFTAudio;
  if (!FFTAudio) return;
  const state = deps.state as Record<string, any>;
  const previewDispatch = state.__livePreviewDispatch
    || (state.__livePreviewDispatch = livePreviewDispatchBuild());
  if (FFTAudio.isRecordingActive()) {
    previewDispatch.stop?.();
    state.__livePreviewActive = false;
    FFTAudio.stopRecording();
    updateWaveTransportLabels();
    deps.setStatus(resonanceLocalizedMessages.recordingStoppedStatus);
    return;
  }
  updateWaveTransportLabels();
  deps.setStatus(resonanceLocalizedMessages.recordingRecordingStatus);
  takeOverlayCaptureCurrentAndRender(deps);
  takeOverlayPrepareNewCurrentState(deps.state);
  state.__livePreviewActive = true;
  delete state.peakHoldSpectrumState;
  previewDispatch.start?.();
  FFTAudio.startRecording({
    onPreview: (wave: Float64Array, sampleRate: number) => {
      previewDispatch.push?.(wave, sampleRate, deps);
    },
    onDone: () => {
      previewDispatch.stop?.();
      state.__livePreviewActive = false;
      recordCaptureRunFromMic(deps);
    },
  }).then(() => {
    updateWaveTransportLabels();
  }).catch((error: any) => {
    previewDispatch.stop?.();
    state.__livePreviewActive = false;
    console.error("[Resonance Reader] record failed", error);
    deps.setStatus(resonanceLocalizedMessages.recordingFailedStatus);
    updateWaveTransportLabels();
  });
}

function recordCaptureRunFromMic(deps: UiBindingsDeps) {
  deps.state.viewRangeMs = null;
  deps.state.noteSelectionRangeMs = null;
  updateWaveTransportLabels();
  const current = (window as any).FFTState?.currentWave || null;
  const wave = current?.wave || current?.samples || null;
  const sampleRate = current?.sampleRate || null;
  const input = { trigger: "record", source: { wave, sampleRate, sourceKind: "mic" } };
  const config = { version: "v1", stages: ["ingest", "refresh"] };
  const runner = (window as any).ResonatePipelineRunner;
  recordingMenuLabelSet(resonanceLocalizedMessages.recordingMicrophoneLabel, deps.state);
  takeOverlayControlsRender(deps);
  if (!runner?.run) {
    console.warn("[Resonance Reader] Pipeline runner missing while event rendering is enabled.");
  } else {
    runner.run(input, config).catch((error: any) => {
      console.error("[Resonance Reader] refresh after record failed", error);
    });
  }
  deps.setStatus(resonanceLocalizedMessages.recordingRecordedStatus);
}

function livePreviewDispatchBuild() {
  let running = false;
  let inFlight = false;
  let latest: { wave: Float64Array; sampleRate: number } | null = null;
  const previewConfig = { version: "v1", stages: ["ingest", "refresh"] };
  const runNext = (deps: UiBindingsDeps) => {
    if (!running || inFlight || !latest) return;
    const payload = latest;
    latest = null;
    inFlight = true;
    const runner = (window as any).ResonatePipelineRunner;
    if (!runner?.run) {
      inFlight = false;
      return;
    }
    const input = {
      trigger: "record.preview",
      source: {
        wave: payload.wave,
        sampleRate: payload.sampleRate,
        sourceKind: "mic",
      },
    };
    runner.run(input, previewConfig)
      .catch((error: any) => {
        console.warn("[Resonance Reader] live FFT preview failed", error);
      })
      .finally(() => {
        inFlight = false;
        if (latest) runNext(deps);
      });
  };

  return {
    start() {
      running = true;
      latest = null;
      inFlight = false;
    },
    stop() {
      running = false;
      latest = null;
    },
    push(wave: Float64Array, sampleRate: number, deps: UiBindingsDeps) {
      if (!running) return;
      latest = { wave, sampleRate };
      runNext(deps);
    },
  };
}

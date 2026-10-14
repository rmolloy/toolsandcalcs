import { recordToggleFromMic } from "./resonate_recording_control.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";
import { spectrumTonePresentationClear } from "./resonate_spectrum_render.js";
import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
import { updateWaveTransportLabels } from "./resonate_transport_labels.js";
import type { UiBindingsDeps } from "./resonate_ui_bindings_contract.js";

export function bindWaveTransport(deps: UiBindingsDeps) {
  bindToneControl(deps.state);
  const btnRecord = document.getElementById("btn_wave_record");
  const btnPlay = document.getElementById("btn_wave_play");
  const btnStop = document.getElementById("btn_wave_stop");
  const btnReset = document.getElementById("btn_reset_zoom");
  if (btnRecord) {
    btnRecord.addEventListener("click", () => {
      const mainRecord = document.getElementById("btn_record");
      if (mainRecord) {
        (mainRecord as HTMLButtonElement).click();
        updateWaveTransportLabels();
        return;
      }
      recordToggleFromMic(deps);
    });
  }
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      const FFTAudio = (window as any).FFTAudio;
      if (!FFTAudio?.playCurrent || !FFTAudio?.isPlaybackActive) return;
      if (FFTAudio.isPlaybackActive()) {
        FFTAudio.stopPlayback?.();
        updateWaveTransportLabels();
        return;
      }
      if (FFTAudio.playCurrent(() => updateWaveTransportLabels())) updateWaveTransportLabels();
    });
  }
  if (btnStop) {
    btnStop.addEventListener("click", () => {
      const FFTAudio = (window as any).FFTAudio;
      FFTAudio?.stopAll?.();
      deps.state.__livePreviewDispatch?.stop?.();
      deps.state.__livePreviewActive = false;
      updateWaveTransportLabels();
      deps.setStatus(resonanceLocalizedMessages.transportStoppedStatus);
    });
  }
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      const plot = document.getElementById("plot_waveform");
      if (plot && (window as any).Plotly) {
        (window as any).Plotly.relayout(plot, { "xaxis.autorange": true });
      }
    });
  }
}

function bindToneControl(state: Record<string, any>) {
  const btnTone = document.getElementById("btn_wave_tone") as HTMLButtonElement | null;
  if (!btnTone) return;
  const tone = toneControllerCreateFromWindow(window);
  toneStateWrite(state, false);
  toneButtonRenderFromState(btnTone, toneStateRead(state));
  btnTone.addEventListener("click", () => {
    const next = !toneStateRead(state);
    toneStateWrite(state, next);
    if (next) toneFrequencyStateReset(state);
    tone.toneEnableSet(next);
    if (!next) {
      tone.toneStop();
      spectrumTonePresentationClear();
    }
    toneButtonRenderFromState(btnTone, next);
  });
}

function toneStateRead(state: Record<string, any>) {
  return Boolean(state.toneEnabled);
}

function toneStateWrite(state: Record<string, any>, enabled: boolean) {
  state.toneEnabled = enabled;
}

function toneFrequencyStateReset(state: Record<string, any>) {
  state.toneFreqHz = null;
}

function toneButtonRenderFromState(button: HTMLButtonElement, enabled: boolean) {
  button.setAttribute("aria-pressed", enabled ? "true" : "false");
  button.classList.toggle("is-active", enabled);
}

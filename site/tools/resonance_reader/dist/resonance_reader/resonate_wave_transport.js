import { recordToggleFromMic } from "./resonate_recording_control.js?rev=3519feba01d2";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=3519feba01d2";
import { spectrumTonePresentationClear } from "./resonate_spectrum_render.js?rev=3519feba01d2";
import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js?rev=3519feba01d2";
import { updateWaveTransportLabels } from "./resonate_transport_labels.js?rev=3519feba01d2";
export function bindWaveTransport(deps) {
    bindToneControl(deps.state);
    const btnRecord = document.getElementById("btn_wave_record");
    const btnPlay = document.getElementById("btn_wave_play");
    const btnStop = document.getElementById("btn_wave_stop");
    const btnReset = document.getElementById("btn_reset_zoom");
    if (btnRecord) {
        btnRecord.addEventListener("click", () => {
            const mainRecord = document.getElementById("btn_record");
            if (mainRecord) {
                mainRecord.click();
                updateWaveTransportLabels();
                return;
            }
            recordToggleFromMic(deps);
        });
    }
    if (btnPlay) {
        btnPlay.addEventListener("click", () => {
            const FFTAudio = window.FFTAudio;
            if (!FFTAudio?.playCurrent || !FFTAudio?.isPlaybackActive)
                return;
            if (FFTAudio.isPlaybackActive()) {
                FFTAudio.stopPlayback?.();
                updateWaveTransportLabels();
                return;
            }
            if (FFTAudio.playCurrent(() => updateWaveTransportLabels()))
                updateWaveTransportLabels();
        });
    }
    if (btnStop) {
        btnStop.addEventListener("click", () => {
            const FFTAudio = window.FFTAudio;
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
            if (plot && window.Plotly) {
                window.Plotly.relayout(plot, { "xaxis.autorange": true });
            }
        });
    }
}
function bindToneControl(state) {
    const btnTone = document.getElementById("btn_wave_tone");
    if (!btnTone)
        return;
    const tone = toneControllerCreateFromWindow(window);
    toneStateWrite(state, false);
    toneButtonRenderFromState(btnTone, toneStateRead(state));
    btnTone.addEventListener("click", () => {
        const next = !toneStateRead(state);
        toneStateWrite(state, next);
        if (next)
            toneFrequencyStateReset(state);
        tone.toneEnableSet(next);
        if (!next) {
            tone.toneStop();
            spectrumTonePresentationClear();
        }
        toneButtonRenderFromState(btnTone, next);
    });
}
function toneStateRead(state) {
    return Boolean(state.toneEnabled);
}
function toneStateWrite(state, enabled) {
    state.toneEnabled = enabled;
}
function toneFrequencyStateReset(state) {
    state.toneFreqHz = null;
}
function toneButtonRenderFromState(button, enabled) {
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.classList.toggle("is-active", enabled);
}

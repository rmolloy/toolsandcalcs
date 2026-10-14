export function resonanceToolVisibilityBind(runtime = window) {
    runtime.addEventListener("tool-visibility-change", (event) => {
        if (event.detail?.visible !== false)
            return;
        resonanceHiddenTransportStop(runtime);
        resonanceHiddenToneStop(runtime.document);
    });
}
function resonanceHiddenTransportStop(runtime) {
    const audio = runtime.FFTAudio;
    if (!audio?.isRecordingActive?.() && !audio?.isRecordingPending?.() && !audio?.isPlaybackActive?.())
        return;
    runtime.document.getElementById("btn_wave_stop")?.click();
}
function resonanceHiddenToneStop(document) {
    const tone = document.getElementById("btn_wave_tone");
    if (tone?.getAttribute("aria-pressed") === "true")
        tone.click();
}

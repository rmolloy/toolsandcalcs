export function resonanceToolVisibilityBind(runtime: Window = window) {
  runtime.addEventListener("tool-visibility-change", (event) => {
    if ((event as CustomEvent).detail?.visible !== false) return;
    resonanceHiddenTransportStop(runtime);
    resonanceHiddenToneStop(runtime.document);
  });
}

function resonanceHiddenTransportStop(runtime: Window) {
  const audio = (runtime as any).FFTAudio;
  if (!audio?.isRecordingActive?.() && !audio?.isRecordingPending?.() && !audio?.isPlaybackActive?.()) return;
  runtime.document.getElementById("btn_wave_stop")?.click();
}

function resonanceHiddenToneStop(document: Document) {
  const tone = document.getElementById("btn_wave_tone");
  if (tone?.getAttribute("aria-pressed") === "true") tone.click();
}

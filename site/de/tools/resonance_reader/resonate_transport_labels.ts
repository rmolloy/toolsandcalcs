import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export function updateWaveTransportLabels() {
  const FFTAudio = (window as any).FFTAudio;
  if (!FFTAudio) return;
  const recording = FFTAudio.isRecordingActive?.() ?? false;
  const playing = FFTAudio.isPlaybackActive?.() ?? false;
  const btnRecord = document.getElementById("btn_wave_record") as HTMLButtonElement | null;
  const btnPlay = document.getElementById("btn_wave_play") as HTMLButtonElement | null;
  const btnStop = document.getElementById("btn_wave_stop") as HTMLButtonElement | null;
  if (btnRecord) {
    btnRecord.innerHTML = recording
      ? transportButtonMarkupBuild("■", resonanceLocalizedMessages.transportStopLabel)
      : transportButtonMarkupBuild("⏺", resonanceLocalizedMessages.transportRecordLabel);
    btnRecord.classList.toggle("is-active", recording);
  }
  if (btnPlay) {
    btnPlay.innerHTML = playing
      ? transportButtonMarkupBuild("■", resonanceLocalizedMessages.transportStopLabel)
      : transportButtonMarkupBuild("▶", resonanceLocalizedMessages.transportPlayLabel);
    btnPlay.classList.toggle("is-active", playing);
  }
  if (btnStop) {
    btnStop.innerHTML = transportButtonMarkupBuild(
      "■",
      resonanceLocalizedMessages.transportStopLabel,
    );
  }
}

function transportButtonMarkupBuild(icon: string, label: string) {
  return `<span class="transport-icon" aria-hidden="true">${icon}</span>${transportLabelHtmlEscape(label)}`;
}

function transportLabelHtmlEscape(label: string) {
  return label.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[character] || character));
}

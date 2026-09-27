import type { ResonanceSaveSurface } from "./resonate_save_contract.js";

const SAVE_HELP: Record<ResonanceSaveSurface["mode"], string> = {
  offline: "Save downloads the current audio as a WAV file. It does not save the analysis settings or the entire session.",
  "lab-disconnected": "Save offers a capture package containing the current audio, analysis state and a plot image. You can also connect a Notebook to attach the capture to a record.",
  "lab-connected": "Save attaches the current capture to a record in your connected Notebook, including its audio and analysis evidence.",
};

export function renderResonanceSaveHelp(
  mode: ResonanceSaveSurface["mode"],
  element: Pick<HTMLElement, "textContent"> | null,
) {
  if (element) element.textContent = SAVE_HELP[mode];
}

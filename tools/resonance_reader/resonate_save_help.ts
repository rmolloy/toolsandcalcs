import type { ResonanceSaveSurface } from "./resonate_save_contract.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

const SAVE_HELP: Record<ResonanceSaveSurface["mode"], string> = {
  offline: resonanceLocalizedMessages.saveHelpOffline,
  "lab-disconnected": resonanceLocalizedMessages.saveHelpDisconnected,
  "lab-connected": resonanceLocalizedMessages.saveHelpConnected,
};

export function renderResonanceSaveHelp(
  mode: ResonanceSaveSurface["mode"],
  element: Pick<HTMLElement, "textContent"> | null,
) {
  if (element) element.textContent = SAVE_HELP[mode];
}

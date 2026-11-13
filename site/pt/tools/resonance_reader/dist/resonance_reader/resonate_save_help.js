import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=6e6ab0f635c5";
const SAVE_HELP = {
    offline: resonanceLocalizedMessages.saveHelpOffline,
    "lab-disconnected": resonanceLocalizedMessages.saveHelpDisconnected,
    "lab-connected": resonanceLocalizedMessages.saveHelpConnected,
};
export function renderResonanceSaveHelp(mode, element) {
    if (element)
        element.textContent = SAVE_HELP[mode];
}

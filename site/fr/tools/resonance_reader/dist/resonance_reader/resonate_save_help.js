import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=aab423209ba9";
const SAVE_HELP = {
    offline: resonanceLocalizedMessages.saveHelpOffline,
    "lab-disconnected": resonanceLocalizedMessages.saveHelpDisconnected,
    "lab-connected": resonanceLocalizedMessages.saveHelpConnected,
};
export function renderResonanceSaveHelp(mode, element) {
    if (element)
        element.textContent = SAVE_HELP[mode];
}

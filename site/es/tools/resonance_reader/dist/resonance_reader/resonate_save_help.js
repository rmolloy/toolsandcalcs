import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=c40b9f2c1b26";
const SAVE_HELP = {
    offline: resonanceLocalizedMessages.saveHelpOffline,
    "lab-disconnected": resonanceLocalizedMessages.saveHelpDisconnected,
    "lab-connected": resonanceLocalizedMessages.saveHelpConnected,
};
export function renderResonanceSaveHelp(mode, element) {
    if (element)
        element.textContent = SAVE_HELP[mode];
}

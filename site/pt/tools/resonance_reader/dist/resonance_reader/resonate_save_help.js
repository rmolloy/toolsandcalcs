import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=e0bd2386cdc0";
const SAVE_HELP = {
    offline: resonanceLocalizedMessages.saveHelpOffline,
    "lab-disconnected": resonanceLocalizedMessages.saveHelpDisconnected,
    "lab-connected": resonanceLocalizedMessages.saveHelpConnected,
};
export function renderResonanceSaveHelp(mode, element) {
    if (element)
        element.textContent = SAVE_HELP[mode];
}

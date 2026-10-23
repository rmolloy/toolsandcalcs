import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=c40b9f2c1b26";
export function recordingMenuLabelSet(label, state) {
    if (state)
        state.recordingLabel = label;
    const menu = takeOverlayMenuElementGet();
    if (!menu)
        return;
    menu.textContent = label;
    recordingMenuWidthSyncFromLabel(menu, label);
}
export function recordingMenuInitialWidthSync() {
    const menu = takeOverlayMenuElementGet();
    if (!menu)
        return;
    recordingMenuWidthSyncFromLabel(menu, menu.textContent || resonanceLocalizedMessages.transportDemoPrompt);
}
export function takeOverlayMenuElementGet() {
    return document.getElementById("take_overlay_menu");
}
function recordingMenuWidthSyncFromLabel(menu, label) {
    const charUnits = recordingMenuWidthCharUnitsFromLabel(label);
    menu.style.width = `${charUnits}ch`;
}
function recordingMenuWidthCharUnitsFromLabel(label) {
    const minCh = 14;
    const maxCh = 34;
    const paddingCh = 4;
    const textCh = Math.max(0, String(label || "").length);
    return Math.max(minCh, Math.min(maxCh, textCh + paddingCh));
}

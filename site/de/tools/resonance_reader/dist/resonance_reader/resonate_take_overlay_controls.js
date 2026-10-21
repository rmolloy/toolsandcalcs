import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=4a9544c40f78";
import { perTabSessionPersist } from "./resonate_per_tab_persistence.js?rev=4a9544c40f78";
import { recordingMenuLabelSet, takeOverlayMenuElementGet, } from "./resonate_recording_menu.js?rev=4a9544c40f78";
import { rerenderFromLastSpectrumIfPossible } from "./resonate_spectrum_rerender.js?rev=4a9544c40f78";
import { takeOverlayCaptureCurrentFromState, takeOverlayClearAll, takeOverlayListRead, takeOverlaySelectAsCurrent, } from "./resonate_take_overlays.js?rev=4a9544c40f78";
export function takeOverlayCaptureCurrentAndRender(deps) {
    if (!takeOverlayCaptureCurrentFromState(deps.state))
        return;
    takeOverlayControlsRender(deps);
}
export function bindTakeOverlayControls(deps) {
    const menu = takeOverlayMenuElementGet();
    const panel = takeOverlayPanelElementGet();
    const clear = takeOverlayClearElementGet();
    if (menu && panel) {
        menu.addEventListener("click", () => takeOverlayPanelToggle(menu, panel));
    }
    if (panel) {
        panel.addEventListener("click", (event) => takeOverlayPanelClickHandle(event, deps));
    }
    if (clear) {
        clear.addEventListener("click", () => takeOverlayClearAndRender(deps));
    }
}
export function takeOverlayControlsRender(deps) {
    const controls = takeOverlayControlsElementGet();
    const panel = takeOverlayPanelElementGet();
    const menu = takeOverlayMenuElementGet();
    const clear = takeOverlayClearElementGet();
    const overlays = takeOverlayListRead(deps.state);
    if (!controls || !panel || !menu || !clear)
        return;
    menu.disabled = overlays.length === 0;
    clear.hidden = overlays.length === 0;
    recordingMenuLabelSet(takeOverlayCurrentLabelRead(deps.state));
    panel.innerHTML = takeOverlayPanelHtmlBuild(deps.state, overlays);
    if (!overlays.length) {
        panel.hidden = true;
        menu.setAttribute("aria-expanded", "false");
    }
}
function takeOverlayClearAndRender(deps) {
    takeOverlayClearAll(deps.state);
    perTabSessionPersist(deps);
    takeOverlayControlsRender(deps);
    rerenderFromLastSpectrumIfPossible(deps.state);
}
function takeOverlayPanelToggle(menu, panel) {
    if (menu.disabled)
        return;
    const expanded = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", expanded ? "false" : "true");
    panel.hidden = expanded;
}
function takeOverlayPanelClickHandle(event, deps) {
    const clearButton = event.target?.closest?.("[data-take-overlay-clear]");
    if (clearButton) {
        takeOverlayClearAndRender(deps);
        return;
    }
    const row = takeOverlaySelectRowResolveFromEvent(event);
    if (!row)
        return;
    takeOverlaySelectAsCurrent(deps.state, row.dataset.takeOverlayId || "");
    perTabSessionPersist(deps);
    takeOverlayControlsRender(deps);
    takeOverlayPanelClose();
    takeOverlayCurrentTakeRender(deps);
}
function takeOverlaySelectRowResolveFromEvent(event) {
    return event.target?.closest?.(".take-overlay-row[data-take-overlay-id]");
}
function takeOverlayCurrentTakeRender(deps) {
    recordingMenuLabelSet(takeOverlayCurrentLabelRead(deps.state), deps.state);
    deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
    if (deps.state.lastWaveSlice)
        deps.renderWaveform(deps.state.lastWaveSlice);
    rerenderCurrentTakeFromLastSpectrumIfPossible(deps.state);
}
function rerenderCurrentTakeFromLastSpectrumIfPossible(state) {
    if (typeof state?.rerenderFromLastSpectrum !== "function")
        return;
    state.preserveSpectrumRangesOnNextRender = true;
    state.dofRefitRequested = true;
    state.rerenderFromLastSpectrum();
}
function takeOverlayPanelClose() {
    const menu = takeOverlayMenuElementGet();
    const panel = takeOverlayPanelElementGet();
    if (menu)
        menu.setAttribute("aria-expanded", "false");
    if (panel)
        panel.hidden = true;
}
function takeOverlayPanelHtmlBuild(state, overlays) {
    return [
        takeOverlayCurrentRowHtmlBuild(takeOverlayCurrentLabelRead(state)),
        ...overlays.map(takeOverlayRowHtmlBuild),
    ].join("");
}
function takeOverlayCurrentRowHtmlBuild(label) {
    return [
        `<div class="take-overlay-row is-current" aria-current="true">`,
        `<span class="take-overlay-row__label">${takeOverlayHtmlEscape(label)}</span>`,
        `<span class="take-overlay-row__state">${takeOverlayHtmlEscape(resonanceLocalizedMessages.takeOverlayCurrentLabel)}</span>`,
        `</div>`,
    ].join("");
}
function takeOverlayRowHtmlBuild(take) {
    return [
        `<button class="take-overlay-row" type="button" data-take-overlay-id="${takeOverlayHtmlEscape(take.id)}" data-take-overlay-select="true">`,
        `<span class="take-overlay-row__label">${takeOverlayHtmlEscape(take.label)}</span>`,
        `<span class="take-overlay-row__state">${takeOverlayHtmlEscape(resonanceLocalizedMessages.takeOverlaySelectLabel)}</span>`,
        `</button>`,
    ].join("");
}
function takeOverlayCurrentLabelRead(state) {
    const label = String(state.recordingLabel || "").trim();
    if (label)
        return label;
    return takeOverlayMenuElementGet()?.textContent?.trim()
        || resonanceLocalizedMessages.transportDemoPrompt;
}
function takeOverlayHtmlEscape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    }[char] || char));
}
function takeOverlayControlsElementGet() {
    return document.getElementById("take_overlay_controls");
}
function takeOverlayPanelElementGet() {
    return document.getElementById("take_overlay_panel");
}
function takeOverlayClearElementGet() {
    return document.getElementById("take_overlay_clear");
}

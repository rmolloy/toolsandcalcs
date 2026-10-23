import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=c40b9f2c1b26";
export function saveButtonElementGet() {
    return document.getElementById("btn_save_audio");
}
export function saveStateRead(state) {
    return state.saveState === "dirty" ? "dirty" : "clean";
}
function saveSurfaceModeRead(state) {
    return state.saveSurfaceMode || "lab-disconnected";
}
function saveStateWrite(state, next) {
    state.saveState = next;
}
export function saveSurfaceModeWrite(state, next) {
    state.saveSurfaceMode = next;
}
function saveSurfaceHintRead(state) {
    return String(state.saveSurfaceHint || "").trim();
}
export function saveSurfaceHintWrite(state, next) {
    state.saveSurfaceHint = String(next || "").trim();
}
export function saveButtonRenderFromState(state) {
    const button = saveButtonElementGet();
    if (!button)
        return;
    const next = saveStateRead(state);
    const isDirty = next === "dirty";
    button.textContent = isDirty
        ? saveButtonLabelBuild(saveSurfaceModeRead(state))
        : resonanceLocalizedMessages.saveButtonSavedLabel;
    button.disabled = !isDirty;
    button.classList.toggle("save-state-dirty", isDirty);
    button.classList.toggle("save-state-clean", !isDirty);
}
function saveButtonLabelBuild(saveSurfaceMode) {
    if (saveSurfaceMode === "lab-disconnected") {
        return resonanceLocalizedMessages.saveButtonMenuLabel;
    }
    return resonanceLocalizedMessages.saveActionLabel;
}
export function readResonanceIdleStatus(state) {
    const hint = saveSurfaceHintRead(state);
    if (!hint) {
        return resonanceLocalizedMessages.saveIdleStatus;
    }
    return resonanceLocalizedMessages.saveIdleStatusWithHintTemplate.replace("{hint}", hint);
}
export function saveStateMarkDirtyAndRender(state) {
    saveStateWrite(state, "dirty");
    saveButtonRenderFromState(state);
}
export function saveStateMarkCleanAndRender(state) {
    saveStateWrite(state, "clean");
    saveButtonRenderFromState(state);
}
export function saveStatePipelineDirtySubscriptionAttach(bus, state) {
    if (!bus?.wire)
        return;
    bus.wire("pipeline.completed", (payload) => {
        const trigger = String(payload?.summary?.trigger || "");
        if (trigger !== "import" && trigger !== "record")
            return;
        saveStateMarkDirtyAndRender(state);
    });
}

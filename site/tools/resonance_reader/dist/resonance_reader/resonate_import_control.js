import { recordingMenuLabelSet } from "./resonate_recording_menu.js?rev=88a3838e0e5a";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=88a3838e0e5a";
import { takeOverlayCaptureCurrentAndRender, takeOverlayControlsRender, } from "./resonate_take_overlay_controls.js?rev=88a3838e0e5a";
import { takeOverlayPrepareNewCurrentState } from "./resonate_take_overlays.js?rev=88a3838e0e5a";
export function bindImport(deps) {
    const btnImport = document.getElementById("btn_import");
    const fileInput = document.getElementById("file_input");
    if (!btnImport || !fileInput)
        return;
    btnImport.addEventListener("click", () => {
        importFileInputPrepare(fileInput);
        if (importControlRequiresProgrammaticClick(btnImport, fileInput)) {
            fileInput.click();
        }
    });
    btnImport.addEventListener("keydown", (event) => {
        if (!importControlUsesNativeLabel(btnImport, fileInput))
            return;
        if (!importKeyShouldOpenChooser(event))
            return;
        event.preventDefault();
        importFileInputPrepare(fileInput);
        fileInput.click();
    });
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        takeOverlayCaptureCurrentAndRender(deps);
        takeOverlayPrepareNewCurrentState(deps.state);
        deps.setStatus(resonanceLocalizedMessages.importLoadingTemplate.replace("{fileName}", file.name));
        recordingMenuLabelSet(file.name, deps.state);
        takeOverlayControlsRender(deps);
        try {
            deps.state.viewRangeMs = null;
            deps.state.noteSelectionRangeMs = null;
            const runner = window.ResonatePipelineRunner;
            if (!runner?.run) {
                throw new Error("Resonance pipeline runner not available");
            }
            const input = { trigger: "import", source: { file, sourceKind: "file" } };
            const config = { version: "v1", stages: ["ingest", "refresh"] };
            await runner.run(input, config);
            deps.setStatus(resonanceLocalizedMessages.importLoadedStatus);
        }
        catch (error) {
            console.error("[Resonance Reader] import failed", error);
            deps.setStatus(resonanceLocalizedMessages.importFailedStatus);
        }
    });
}
export function importFileInputPrepare(fileInput) {
    fileInput.value = "";
}
export function importControlUsesNativeLabel(control, fileInput) {
    return importControlTagNameRead(control) === "label"
        && control.htmlFor === fileInput.id;
}
function importControlRequiresProgrammaticClick(control, fileInput) {
    return !importControlUsesNativeLabel(control, fileInput);
}
function importKeyShouldOpenChooser(event) {
    return event.key === "Enter" || event.key === " ";
}
function importControlTagNameRead(control) {
    return control.tagName.toLowerCase();
}

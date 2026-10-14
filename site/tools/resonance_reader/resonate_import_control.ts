import { recordingMenuLabelSet } from "./resonate_recording_menu.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";
import {
  takeOverlayCaptureCurrentAndRender,
  takeOverlayControlsRender,
} from "./resonate_take_overlay_controls.js";
import { takeOverlayPrepareNewCurrentState } from "./resonate_take_overlays.js";
import type { UiBindingsDeps } from "./resonate_ui_bindings_contract.js";

export function bindImport(deps: UiBindingsDeps) {
  const btnImport = document.getElementById("btn_import") as HTMLElement | null;
  const fileInput = document.getElementById("file_input") as HTMLInputElement | null;
  if (!btnImport || !fileInput) return;
  btnImport.addEventListener("click", () => {
    importFileInputPrepare(fileInput);
    if (importControlRequiresProgrammaticClick(btnImport, fileInput)) {
      fileInput.click();
    }
  });
  btnImport.addEventListener("keydown", (event) => {
    if (!importControlUsesNativeLabel(btnImport, fileInput)) return;
    if (!importKeyShouldOpenChooser(event)) return;
    event.preventDefault();
    importFileInputPrepare(fileInput);
    fileInput.click();
  });
  fileInput.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    takeOverlayCaptureCurrentAndRender(deps);
    takeOverlayPrepareNewCurrentState(deps.state);
    deps.setStatus(resonanceLocalizedMessages.importLoadingTemplate.replace(
      "{fileName}",
      file.name,
    ));
    recordingMenuLabelSet(file.name, deps.state);
    takeOverlayControlsRender(deps);
    try {
      deps.state.viewRangeMs = null;
      deps.state.noteSelectionRangeMs = null;
      const runner = (window as any).ResonatePipelineRunner;
      if (!runner?.run) {
        throw new Error("Resonance pipeline runner not available");
      }
      const input = { trigger: "import", source: { file, sourceKind: "file" } };
      const config = { version: "v1", stages: ["ingest", "refresh"] };
      await runner.run(input, config);
      deps.setStatus(resonanceLocalizedMessages.importLoadedStatus);
    } catch (error) {
      console.error("[Resonance Reader] import failed", error);
      deps.setStatus(resonanceLocalizedMessages.importFailedStatus);
    }
  });
}

export function importFileInputPrepare(fileInput: HTMLInputElement) {
  fileInput.value = "";
}

export function importControlUsesNativeLabel(
  control: HTMLElement,
  fileInput: HTMLInputElement,
) {
  return importControlTagNameRead(control) === "label"
    && (control as HTMLLabelElement).htmlFor === fileInput.id;
}

function importControlRequiresProgrammaticClick(
  control: HTMLElement,
  fileInput: HTMLInputElement,
) {
  return !importControlUsesNativeLabel(control, fileInput);
}

function importKeyShouldOpenChooser(event: KeyboardEvent) {
  return event.key === "Enter" || event.key === " ";
}

function importControlTagNameRead(control: HTMLElement) {
  return control.tagName.toLowerCase();
}

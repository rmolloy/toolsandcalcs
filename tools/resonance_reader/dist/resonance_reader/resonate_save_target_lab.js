import { resonanceCapturePlotPngBlobBuild, resonanceCaptureStateJsonBuild, resonanceCaptureWaveBlobBuild, } from "./resonate_capture_package.js";
import { persistResonanceNotebookConnectDraft } from "./resonate_notebook_connect_draft.js";
import { readNotebookConnectionForResonanceSave } from "./resonate_notebook_connection_client.js";
import { listNotebookSubjectsForResonanceSave, saveNotebookResonanceCapture } from "./resonate_notebook_save_client.js";
import { downloadResonanceCapturePackage } from "./resonate_save_package_download.js";
import { openConnectedResonanceSaveModal } from "./resonate_save_modal.js";
import { openResonanceSaveMenu } from "./resonate_save_menu.js";
export function resonanceSaveRunnerCreate() {
    return {
        readResonanceSaveSurface,
        runResonanceSaveAction,
    };
}
async function readResonanceSaveSurface() {
    const connection = await readNotebookConnectionForResonanceSave();
    if (connection.accessState !== "lab-connected") {
        return {
            mode: "lab-disconnected",
            label: "Save",
            accessState: connection.accessState,
        };
    }
    return {
        mode: "lab-connected",
        label: "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
    };
}
async function runResonanceSaveAction(request) {
    if (!hasWaveformCapture()) {
        request.setStatus("Load or record before saving.");
        return false;
    }
    return await resonanceSaveActionForSurface(readResonanceSaveSurface(), request);
}
async function resonanceSaveActionForSurface(saveSurfacePromise, request) {
    const saveSurface = await saveSurfacePromise;
    if (saveSurface.mode === "lab-connected") {
        return await resonanceConnectedSaveActionRun(saveSurface, request);
    }
    if (saveSurface.mode !== "lab-disconnected") {
        return false;
    }
    return await resonanceDisconnectedSaveActionRun(saveSurface, request);
}
async function resonanceConnectedSaveActionRun(saveSurface, request) {
    const subjects = await listNotebookSubjectsForResonanceSave(saveSurface.workbookId);
    const selection = await openConnectedResonanceSaveModal({
        measureMode: request.state.measureMode,
        notebookName: saveSurface.notebookName,
        subjects,
    });
    if (!selection) {
        return false;
    }
    const recordingLabel = resonanceCaptureRecordingLabelRead(request.state);
    const stateJson = JSON.stringify(resonanceCaptureStateJsonBuild({
        toolVersion: resonanceReaderToolVersionRead(),
        savedAtIso: new Date().toISOString(),
        recordingLabel,
        state: request.state,
    }), null, 2);
    const result = await saveNotebookResonanceCapture({
        workbookId: saveSurface.workbookId,
        subject: selection.subject,
        event: selection.event,
        package: {
            recordingLabel,
            stateJson,
            wavBlob: resonanceCaptureWaveBlobBuild(request.state),
            plotPngBlob: await resonanceCapturePlotPngBlobBuild(document.getElementById("plot_fft")),
        },
    });
    request.setStatus(`Saved to ${saveSurface.notebookName || "Notebook"}.`);
    request.state.lastNotebookSave = result;
    return true;
}
async function resonanceDisconnectedSaveActionRun(saveSurface, request) {
    const action = request.action || await openResonanceDisconnectedSaveMenu(request.button, saveSurface);
    if (action === "connect-notebook") {
        if (!canRunNotebookConnectAction(saveSurface)) {
            return false;
        }
        persistResonanceNotebookConnectDraft(window, request.state, resonanceCaptureRecordingLabelRead(request.state));
        window.location.assign(buildResonanceNotebookConnectUrl(window));
        return false;
    }
    if (action !== "download-package") {
        return false;
    }
    await downloadResonanceCapturePackage({
        state: request.state,
        recordingLabel: resonanceCaptureRecordingLabelRead(request.state),
        plotElement: document.getElementById("plot_fft"),
    });
    request.setStatus("Package downloaded.");
    return true;
}
function buildResonanceNotebookConnectUrl(runtime) {
    const returnTo = readResonanceNotebookReturnTo(runtime);
    if (!returnTo) {
        return "/notebook/";
    }
    return `/notebook/?return_to=${encodeURIComponent(returnTo)}`;
}
function readResonanceNotebookReturnTo(runtime) {
    const pathname = String(runtime?.location?.pathname || "").trim();
    const search = String(runtime?.location?.search || "").trim();
    const value = `${pathname}${search}`;
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return "";
    }
    return value;
}
async function openResonanceDisconnectedSaveMenu(button, saveSurface) {
    return await openResonanceSaveMenu({
        anchor: button,
        items: buildResonanceDisconnectedSaveMenuItems(saveSurface),
    });
}
function buildResonanceDisconnectedSaveMenuItems(saveSurface) {
    const items = [
        {
            key: "download-package",
            label: "Download Package",
            description: "Save state.json, source.wav, and plot.png locally.",
        },
    ];
    if (canRunNotebookConnectAction(saveSurface)) {
        items.push({
            key: "connect-notebook",
            label: "Connect Google Drive + Notebook",
            description: "Connect first, then save the package into your notebook.",
        });
    }
    return items;
}
function canRunNotebookConnectAction(saveSurface) {
    return saveSurface.mode === "lab-disconnected" && saveSurface.accessState === "signed_in_no_workbook";
}
function hasWaveformCapture() {
    return Boolean(window.FFTState?.currentWave);
}
function resonanceCaptureRecordingLabelRead(state) {
    return String(state.recordingLabel || recordingSelectElementRead()?.selectedOptions?.[0]?.textContent || "resonance-capture");
}
function resonanceReaderToolVersionRead() {
    return (document.documentElement?.dataset?.toolVersion || "dev").trim() || "dev";
}
function recordingSelectElementRead() {
    return document.getElementById("recording_select");
}

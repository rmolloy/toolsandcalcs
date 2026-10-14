import { resonanceCapturePlotPngBlobBuild, resonanceCaptureStateJsonBuild, resonanceCaptureWaveBlobBuild, } from "./resonate_capture_package.js?rev=88a3838e0e5a";
import { persistResonanceNotebookConnectDraft } from "./resonate_notebook_connect_draft.js?rev=88a3838e0e5a";
import { readNotebookConnectionForResonanceSave } from "./resonate_notebook_connection_client.js?rev=88a3838e0e5a";
import { listNotebookSubjectsForResonanceSave, saveNotebookResonanceCapture } from "./resonate_notebook_save_client.js?rev=88a3838e0e5a";
import { downloadResonanceCapturePackage } from "./resonate_save_package_download.js?rev=88a3838e0e5a";
import { openConnectedResonanceSaveModal } from "./resonate_save_modal.js?rev=88a3838e0e5a";
import { openResonanceSaveMenu } from "./resonate_save_menu.js?rev=88a3838e0e5a";
import { resonanceSaveSummaryBuild } from "./resonate_save_summary.js?rev=88a3838e0e5a";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=88a3838e0e5a";
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
            label: resonanceLocalizedMessages.saveActionLabel,
            accessState: connection.accessState,
        };
    }
    return {
        mode: "lab-connected",
        label: resonanceLocalizedMessages.saveActionLabel,
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
    };
}
async function runResonanceSaveAction(request) {
    if (!hasWaveformCapture()) {
        request.setStatus(resonanceLocalizedMessages.saveLoadFirstStatus);
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
    const recordingLabel = resonanceCaptureRecordingLabelRead(request.state);
    const selection = await openConnectedResonanceSaveModal({
        measureMode: request.state.measureMode,
        notebookName: saveSurface.notebookName,
        subjects,
        summary: resonanceSaveSummaryBuild(request.state, recordingLabel),
    });
    if (!selection) {
        return false;
    }
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
    request.setStatus(resonanceLocalizedMessages.saveSavedToNotebookTemplate.replace("{notebookName}", saveSurface.notebookName || resonanceLocalizedMessages.saveDefaultNotebookName));
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
    request.setStatus(resonanceLocalizedMessages.savePackageDownloadedStatus);
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
            label: resonanceLocalizedMessages.saveDownloadPackageLabel,
            description: resonanceLocalizedMessages.saveDownloadPackageDescription,
        },
    ];
    if (canRunNotebookConnectAction(saveSurface)) {
        items.push({
            key: "connect-notebook",
            label: resonanceLocalizedMessages.saveConnectNotebookLabel,
            description: resonanceLocalizedMessages.saveConnectNotebookDescription,
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
    return String(state.recordingLabel || recordingMenuLabelRead() || "resonance-capture");
}
function resonanceReaderToolVersionRead() {
    return (document.documentElement?.dataset?.toolVersion || "dev").trim() || "dev";
}
function recordingMenuLabelRead() {
    return document.getElementById("take_overlay_menu")?.textContent?.trim() || "";
}

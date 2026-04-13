import type {
  ResonanceSaveActionRequest,
  ResonanceSaveActionRunner,
  ResonanceSaveSurface,
} from "./resonate_save_contract.js";
import {
  resonanceCapturePlotPngBlobBuild,
  resonanceCaptureStateJsonBuild,
  resonanceCaptureWaveBlobBuild,
} from "./resonate_capture_package.js";
import { persistResonanceNotebookConnectDraft } from "./resonate_notebook_connect_draft.js";
import { readNotebookConnectionForResonanceSave } from "./resonate_notebook_connection_client.js";
import { listNotebookSubjectsForResonanceSave, saveNotebookResonanceCapture } from "./resonate_notebook_save_client.js";
import { downloadResonanceCapturePackage } from "./resonate_save_package_download.js";
import { openConnectedResonanceSaveModal } from "./resonate_save_modal.js";
import { openResonanceSaveMenu } from "./resonate_save_menu.js";

export function resonanceSaveRunnerCreate(): ResonanceSaveActionRunner {
  return {
    readResonanceSaveSurface,
    runResonanceSaveAction,
  };
}

async function readResonanceSaveSurface(): Promise<ResonanceSaveSurface> {
  const connection = await readNotebookConnectionForResonanceSave();
  if (!connection) {
    return { mode: "lab-disconnected", label: "Save" };
  }

  return {
    mode: "lab-connected",
    label: "Save",
    workbookId: connection.workbookId,
    notebookName: connection.notebookName,
  };
}

async function runResonanceSaveAction(request: ResonanceSaveActionRequest): Promise<boolean> {
  if (!hasWaveformCapture()) {
    request.setStatus("Load or record before saving.");
    return false;
  }

  return await resonanceSaveActionForSurface(readResonanceSaveSurface(), request);
}

async function resonanceSaveActionForSurface(
  saveSurfacePromise: Promise<ResonanceSaveSurface>,
  request: ResonanceSaveActionRequest,
): Promise<boolean> {
  const saveSurface = await saveSurfacePromise;
  if (saveSurface.mode === "lab-connected") {
    return await resonanceConnectedSaveActionRun(saveSurface, request);
  }

  return await resonanceDisconnectedSaveActionRun(request);
}

async function resonanceConnectedSaveActionRun(
  saveSurface: Extract<ResonanceSaveSurface, { mode: "lab-connected" }>,
  request: ResonanceSaveActionRequest,
): Promise<boolean> {
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

async function resonanceDisconnectedSaveActionRun(request: ResonanceSaveActionRequest): Promise<boolean> {
  const action = request.action || await resonanceDisconnectedSaveActionRead(request.button);
  if (action === "connect-notebook") {
    persistResonanceNotebookConnectDraft(
      window,
      request.state,
      resonanceCaptureRecordingLabelRead(request.state),
    );
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

function buildResonanceNotebookConnectUrl(runtime: Window): string {
  const returnTo = readResonanceNotebookReturnTo(runtime);
  if (!returnTo) {
    return "/notebook/";
  }

  return `/notebook/?return_to=${encodeURIComponent(returnTo)}`;
}

function readResonanceNotebookReturnTo(runtime: Window): string {
  const pathname = String(runtime?.location?.pathname || "").trim();
  const search = String(runtime?.location?.search || "").trim();
  const value = `${pathname}${search}`;

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }

  return value;
}

async function resonanceDisconnectedSaveActionRead(button: HTMLElement | null | undefined): Promise<string | null> {
  return await openResonanceSaveMenu({
    anchor: button,
    items: [
      {
        key: "download-package",
        label: "Download Package",
        description: "Save state.json, source.wav, and plot.png locally.",
      },
      {
        key: "connect-notebook",
        label: "Connect Google Drive + Notebook",
        description: "Connect first, then save the package into your notebook.",
      },
    ],
  });
}

function hasWaveformCapture(): boolean {
  return Boolean((window as any).FFTState?.currentWave);
}

function resonanceCaptureRecordingLabelRead(state: Record<string, any>): string {
  return String(state.recordingLabel || recordingSelectElementRead()?.selectedOptions?.[0]?.textContent || "resonance-capture");
}

function resonanceReaderToolVersionRead(): string {
  return (document.documentElement?.dataset?.toolVersion || "dev").trim() || "dev";
}

function recordingSelectElementRead(): HTMLSelectElement | null {
  return document.getElementById("recording_select") as HTMLSelectElement | null;
}

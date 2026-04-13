import { restoreResonanceSavedStateDocument } from "./resonate_notebook_connect_draft.js";
import { readNotebookRestorePayloadForResonance } from "./resonate_notebook_restore_client.js";
export async function restoreResonanceNotebookEventIntoState(args) {
    const request = readResonanceNotebookRestoreRequest(args.runtime);
    if (!request) {
        return false;
    }
    const payload = await (args.readRestorePayload || readNotebookRestorePayloadForResonance)(request.workbookId, request.eventId);
    if (String(payload.toolId || "").trim() !== "resonance_reader") {
        return false;
    }
    if (!restoreResonanceSavedStateDocument(args.state, payload.stateDocument || null)) {
        return false;
    }
    clearResonanceNotebookRestoreRequest(args.runtime);
    return true;
}
export function readResonanceNotebookRestoreRequest(runtime) {
    const params = new URLSearchParams(String(runtime.location.search || ""));
    const workbookId = String(params.get("restoreWorkbookId") || "").trim();
    const eventId = String(params.get("restoreEventId") || "").trim();
    if (!workbookId || !eventId) {
        return null;
    }
    return { workbookId, eventId };
}
function clearResonanceNotebookRestoreRequest(runtime) {
    const url = new URL(String(runtime.location.href || `${runtime.location.pathname}${runtime.location.search}`), "http://localhost");
    url.searchParams.delete("restoreWorkbookId");
    url.searchParams.delete("restoreEventId");
    if (runtime.history && typeof runtime.history.replaceState === "function") {
        runtime.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
}

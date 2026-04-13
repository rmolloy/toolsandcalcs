(function (globalScope) {
  async function restoreDofNotebookEventIntoUi(args) {
    var request = readDofNotebookRestoreRequest(args.runtime || globalScope);

    if (!request) {
      return false;
    }

    var payload = await readRestorePayload(args, request);
    var snapshot = readDofNotebookRestoreSnapshot(payload.stateDocument);

    if (String(payload.toolId || "").trim() !== "dof_model" || !snapshot) {
      return false;
    }

    args.applySnapshot(snapshot);
    clearDofNotebookRestoreRequest(args.runtime || globalScope);
    return true;
  }

  function readDofNotebookRestoreRequest(runtime) {
    var params = new URLSearchParams(String(runtime.location && runtime.location.search || ""));
    var workbookId = String(params.get("restoreWorkbookId") || "").trim();
    var eventId = String(params.get("restoreEventId") || "").trim();

    if (!workbookId || !eventId) {
      return null;
    }

    return { workbookId: workbookId, eventId: eventId };
  }

  async function readRestorePayload(args, request) {
    return await readDofNotebookRestoreClient()
      .readNotebookRestorePayloadForDof(request.workbookId, request.eventId, args.fetchImpl);
  }

  function readDofNotebookRestoreSnapshot(stateDocument) {
    if (!stateDocument) {
      return null;
    }

    return readDofSaveSurface().readDofSavePackageDocument(stateDocument);
  }

  function clearDofNotebookRestoreRequest(runtime) {
    var location = runtime.location || {};
    var fallbackUrl = String(location.pathname || "") + String(location.search || "");
    var url = new URL(String(location.href || fallbackUrl), "http://localhost");

    url.searchParams.delete("restoreWorkbookId");
    url.searchParams.delete("restoreEventId");

    if (runtime.history && typeof runtime.history.replaceState === "function") {
      runtime.history.replaceState(null, "", String(url.pathname + url.search));
    }
  }

  function readDofNotebookRestoreClient() {
    if (globalScope.DofNotebookRestoreClient) {
      return globalScope.DofNotebookRestoreClient;
    }

    if (typeof require === "function") {
      return require("./dof_notebook_restore_client.js");
    }

    throw new Error("DOF notebook restore client is unavailable.");
  }

  function readDofSaveSurface() {
    if (globalScope.DofSaveSurface) {
      return globalScope.DofSaveSurface;
    }

    if (typeof require === "function") {
      return require("./dof_save_surface.js");
    }

    throw new Error("DOF save surface is unavailable.");
  }

  var api = {
    readDofNotebookRestoreRequest: readDofNotebookRestoreRequest,
    restoreDofNotebookEventIntoUi: restoreDofNotebookEventIntoUi,
  };

  globalScope.DofNotebookRestore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

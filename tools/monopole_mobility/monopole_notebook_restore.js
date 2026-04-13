(function (globalScope) {
  async function restoreMonopoleNotebookEventIntoUi(args) {
    var request = readMonopoleNotebookRestoreRequest(args.runtime || globalScope);

    if (!request) {
      return false;
    }

    var payload = await readRestorePayload(args, request);
    var snapshot = readMonopoleNotebookRestoreSnapshot(payload.stateDocument);

    if (String(payload.toolId || "").trim() !== "monopole_mobility" || !snapshot) {
      return false;
    }

    args.applySnapshot(snapshot);
    clearMonopoleNotebookRestoreRequest(args.runtime || globalScope);
    return true;
  }

  function readMonopoleNotebookRestoreRequest(runtime) {
    var params = new URLSearchParams(String(runtime.location && runtime.location.search || ""));
    var workbookId = String(params.get("restoreWorkbookId") || "").trim();
    var eventId = String(params.get("restoreEventId") || "").trim();

    if (!workbookId || !eventId) {
      return null;
    }

    return { workbookId: workbookId, eventId: eventId };
  }

  async function readRestorePayload(args, request) {
    return await readMonopoleNotebookRestoreClient()
      .readNotebookRestorePayloadForMonopole(request.workbookId, request.eventId, args.fetchImpl);
  }

  function readMonopoleNotebookRestoreSnapshot(stateDocument) {
    if (!stateDocument) {
      return null;
    }

    return readMonopoleSaveSurface().readMonopoleSavePackageDocument(stateDocument);
  }

  function clearMonopoleNotebookRestoreRequest(runtime) {
    var location = runtime.location || {};
    var fallbackUrl = String(location.pathname || "") + String(location.search || "");
    var url = new URL(String(location.href || fallbackUrl), "http://localhost");

    url.searchParams.delete("restoreWorkbookId");
    url.searchParams.delete("restoreEventId");

    if (runtime.history && typeof runtime.history.replaceState === "function") {
      runtime.history.replaceState(null, "", String(url.pathname + url.search));
    }
  }

  function readMonopoleNotebookRestoreClient() {
    if (globalScope.MonopoleNotebookRestoreClient) {
      return globalScope.MonopoleNotebookRestoreClient;
    }

    if (typeof require === "function") {
      return require("./monopole_notebook_restore_client.js");
    }

    throw new Error("Monopole notebook restore client is unavailable.");
  }

  function readMonopoleSaveSurface() {
    if (globalScope.MonopoleSaveSurface) {
      return globalScope.MonopoleSaveSurface;
    }

    if (typeof require === "function") {
      return require("./monopole_save_surface.js");
    }

    throw new Error("Monopole save surface is unavailable.");
  }

  var api = {
    readMonopoleNotebookRestoreRequest: readMonopoleNotebookRestoreRequest,
    restoreMonopoleNotebookEventIntoUi: restoreMonopoleNotebookEventIntoUi,
  };

  globalScope.MonopoleNotebookRestore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

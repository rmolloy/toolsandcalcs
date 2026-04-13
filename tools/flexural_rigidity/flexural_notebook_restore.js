(function (globalScope) {
  async function restoreFlexuralNotebookEventIntoUi(args) {
    var request = readFlexuralNotebookRestoreRequest(args.runtime || globalScope);

    if (!request) {
      return false;
    }

    var payload = await readRestorePayload(args, request);
    var snapshot = readFlexuralNotebookRestoreSnapshot(payload.stateDocument);

    if (String(payload.toolId || "").trim() !== "flexural_rigidity" || !snapshot) {
      return false;
    }

    args.applySnapshot(snapshot);
    clearFlexuralNotebookRestoreRequest(args.runtime || globalScope);
    return true;
  }

  function readFlexuralNotebookRestoreRequest(runtime) {
    var params = new URLSearchParams(String(runtime.location && runtime.location.search || ""));
    var workbookId = String(params.get("restoreWorkbookId") || "").trim();
    var eventId = String(params.get("restoreEventId") || "").trim();

    if (!workbookId || !eventId) {
      return null;
    }

    return { workbookId: workbookId, eventId: eventId };
  }

  async function readRestorePayload(args, request) {
    return await readFlexuralNotebookRestoreClient()
      .readNotebookRestorePayloadForFlexural(request.workbookId, request.eventId, args.fetchImpl);
  }

  function readFlexuralNotebookRestoreSnapshot(stateDocument) {
    if (!stateDocument) {
      return null;
    }

    return readFlexuralSaveSurface().readFlexuralSavePackageDocument(stateDocument);
  }

  function clearFlexuralNotebookRestoreRequest(runtime) {
    var location = runtime.location || {};
    var fallbackUrl = String(location.pathname || "") + String(location.search || "");
    var url = new URL(String(location.href || fallbackUrl), "http://localhost");

    url.searchParams.delete("restoreWorkbookId");
    url.searchParams.delete("restoreEventId");

    if (runtime.history && typeof runtime.history.replaceState === "function") {
      runtime.history.replaceState(null, "", String(url.pathname + url.search));
    }
  }

  function readFlexuralNotebookRestoreClient() {
    if (globalScope.FlexuralNotebookRestoreClient) {
      return globalScope.FlexuralNotebookRestoreClient;
    }

    if (typeof require === "function") {
      return require("./flexural_notebook_restore_client.js");
    }

    throw new Error("Flexural notebook restore client is unavailable.");
  }

  function readFlexuralSaveSurface() {
    if (globalScope.FlexuralSaveSurface) {
      return globalScope.FlexuralSaveSurface;
    }

    if (typeof require === "function") {
      return require("./flexural_save_surface.js");
    }

    throw new Error("Flexural save surface is unavailable.");
  }

  var api = {
    readFlexuralNotebookRestoreRequest: readFlexuralNotebookRestoreRequest,
    restoreFlexuralNotebookEventIntoUi: restoreFlexuralNotebookEventIntoUi,
  };

  globalScope.FlexuralNotebookRestore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

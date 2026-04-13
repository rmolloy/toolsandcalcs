(function (globalScope) {
  async function restoreBraceNotebookEventIntoUi(args) {
    var request = readBraceNotebookRestoreRequest(args.runtime || globalScope);

    if (!request) {
      return false;
    }

    var payload = await readRestorePayload(args, request);
    var braces = readBraceNotebookRestoreSnapshot(payload.stateDocument);

    if (String(payload.toolId || "").trim() !== "brace_calculator" || !Array.isArray(braces)) {
      return false;
    }

    args.applyBraces(braces);
    clearBraceNotebookRestoreRequest(args.runtime || globalScope);
    return true;
  }

  function readBraceNotebookRestoreRequest(runtime) {
    var params = new URLSearchParams(String(runtime.location && runtime.location.search || ""));
    var workbookId = String(params.get("restoreWorkbookId") || "").trim();
    var eventId = String(params.get("restoreEventId") || "").trim();

    if (!workbookId || !eventId) {
      return null;
    }

    return { workbookId: workbookId, eventId: eventId };
  }

  async function readRestorePayload(args, request) {
    return await readBraceNotebookRestoreClient()
      .readNotebookRestorePayloadForBrace(request.workbookId, request.eventId, args.fetchImpl);
  }

  function readBraceNotebookRestoreSnapshot(stateDocument) {
    if (!stateDocument) {
      return null;
    }

    return readBraceSaveSurface().readBraceSavePackageDocument(stateDocument);
  }

  function clearBraceNotebookRestoreRequest(runtime) {
    var location = runtime.location || {};
    var fallbackUrl = String(location.pathname || "") + String(location.search || "");
    var url = new URL(String(location.href || fallbackUrl), "http://localhost");

    url.searchParams.delete("restoreWorkbookId");
    url.searchParams.delete("restoreEventId");

    if (runtime.history && typeof runtime.history.replaceState === "function") {
      runtime.history.replaceState(null, "", String(url.pathname + url.search));
    }
  }

  function readBraceNotebookRestoreClient() {
    if (globalScope.BraceNotebookRestoreClient) {
      return globalScope.BraceNotebookRestoreClient;
    }

    if (typeof require === "function") {
      return require("./brace_notebook_restore_client.js");
    }

    throw new Error("Brace notebook restore client is unavailable.");
  }

  function readBraceSaveSurface() {
    if (globalScope.BraceSaveSurface) {
      return globalScope.BraceSaveSurface;
    }

    if (typeof require === "function") {
      return require("./brace_save_surface.js");
    }

    throw new Error("Brace save surface is unavailable.");
  }

  var api = {
    readBraceNotebookRestoreRequest: readBraceNotebookRestoreRequest,
    restoreBraceNotebookEventIntoUi: restoreBraceNotebookEventIntoUi,
  };

  globalScope.BraceNotebookRestore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

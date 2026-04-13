(function (globalScope) {
  async function restorePlateThicknessNotebookEventIntoUi(args) {
    var request = readPlateThicknessNotebookRestoreRequest(args.runtime || globalScope);

    if (!request) {
      return false;
    }

    var payload = await readRestorePayload(args, request);
    var snapshot = readPlateThicknessNotebookRestoreSnapshot(payload.stateDocument);

    if (String(payload.toolId || "").trim() !== "plate_thickness" || !snapshot) {
      return false;
    }

    args.applySnapshot(snapshot);
    clearPlateThicknessNotebookRestoreRequest(args.runtime || globalScope);
    return true;
  }

  function readPlateThicknessNotebookRestoreRequest(runtime) {
    var params = new URLSearchParams(String(runtime.location && runtime.location.search || ""));
    var workbookId = String(params.get("restoreWorkbookId") || "").trim();
    var eventId = String(params.get("restoreEventId") || "").trim();

    if (!workbookId || !eventId) {
      return null;
    }

    return { workbookId: workbookId, eventId: eventId };
  }

  async function readRestorePayload(args, request) {
    return await readPlateThicknessNotebookRestoreClient()
      .readNotebookRestorePayloadForPlateThickness(request.workbookId, request.eventId, args.fetchImpl);
  }

  function readPlateThicknessNotebookRestoreSnapshot(stateDocument) {
    if (!stateDocument) {
      return null;
    }

    return readPlateThicknessSaveSurface().readPlateThicknessSavePackageDocument(stateDocument);
  }

  function clearPlateThicknessNotebookRestoreRequest(runtime) {
    var location = runtime.location || {};
    var fallbackUrl = String(location.pathname || "") + String(location.search || "");
    var url = new URL(String(location.href || fallbackUrl), "http://localhost");

    url.searchParams.delete("restoreWorkbookId");
    url.searchParams.delete("restoreEventId");

    if (runtime.history && typeof runtime.history.replaceState === "function") {
      runtime.history.replaceState(null, "", String(url.pathname + url.search));
    }
  }

  function readPlateThicknessNotebookRestoreClient() {
    if (globalScope.PlateThicknessNotebookRestoreClient) {
      return globalScope.PlateThicknessNotebookRestoreClient;
    }

    if (typeof require === "function") {
      return require("./plate_thickness_notebook_restore_client.js");
    }

    throw new Error("Plate Thickness notebook restore client is unavailable.");
  }

  function readPlateThicknessSaveSurface() {
    if (globalScope.PlateThicknessSaveSurface) {
      return globalScope.PlateThicknessSaveSurface;
    }

    if (typeof require === "function") {
      return require("./plate_thickness_save_surface.js");
    }

    throw new Error("Plate Thickness save surface is unavailable.");
  }

  var api = {
    readPlateThicknessNotebookRestoreRequest: readPlateThicknessNotebookRestoreRequest,
    restorePlateThicknessNotebookEventIntoUi: restorePlateThicknessNotebookEventIntoUi,
  };

  globalScope.PlateThicknessNotebookRestore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

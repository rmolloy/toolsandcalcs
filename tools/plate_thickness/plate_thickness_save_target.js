(function (globalScope) {
  function plateThicknessSaveRunnerCreate() {
    return {
      readPlateThicknessSaveSurface: readPlateThicknessSaveSurface,
      runPlateThicknessSaveAction: runPlateThicknessSaveAction,
    };
  }

  async function readPlateThicknessSaveSurface() {
    var connection = await readNotebookConnectionForPlateThicknessSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readPlateThicknessSaveSurfaceApi().readPlateThicknessSaveSurface();
  }

  async function runPlateThicknessSaveAction(request) {
    var surface = await readPlateThicknessSaveSurface();

    if (surface.mode === "lab-connected") {
      return await runConnectedPlateThicknessSaveAction(surface, request);
    }

    return await runOfflinePlateThicknessSaveAction(request);
  }

  async function runConnectedPlateThicknessSaveAction(surface, request) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForPlateThicknessSave(surface.workbookId);
    var selection = await readPlateThicknessSaveModalApi().openConnectedPlateThicknessSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: readPlateThicknessDefaultDisplayName(snapshot),
    });

    if (!selection) {
      return false;
    }

    var savePackage = readPlateThicknessSaveSurfaceApi().buildPlateThicknessSavePackage(snapshot);
    await readNotebookSaveClient().saveNotebookPlateThicknessCapture({
      workbookId: surface.workbookId,
      subject: selection.subject,
      event: selection.event,
      package: {
        stateJson: savePackage.text,
      },
    });
    request.setStatus("Saved to " + (surface.notebookName || "Notebook") + ".");
    return true;
  }

  async function runOfflinePlateThicknessSaveAction(request) {
    var savePackage = readPlateThicknessSaveSurfaceApi().buildPlateThicknessSavePackage(request.readSnapshot());
    readPlateThicknessSaveSurfaceApi().downloadPlateThicknessSavePackage(globalScope, savePackage);
    request.setStatus("JSON package downloaded");
    return Promise.resolve(true);
  }

  async function readNotebookConnectionForPlateThicknessSave() {
    if (!canRunConnectedPlateThicknessSave()) {
      return null;
    }

    return await readNotebookConnectionClient().readNotebookConnectionForPlateThicknessSave();
  }

  function canRunConnectedPlateThicknessSave() {
    return Boolean(
      globalScope.PlateThicknessNotebookConnectionClient &&
      globalScope.PlateThicknessNotebookSaveClient &&
      globalScope.PlateThicknessSaveModal
    );
  }

  function readPlateThicknessDefaultDisplayName(_snapshot) {
    return "Plate Stock";
  }

  function readPlateThicknessSaveSurfaceApi() {
    if (globalScope.PlateThicknessSaveSurface) {
      return globalScope.PlateThicknessSaveSurface;
    }

    throw new Error("Plate Thickness save surface is unavailable.");
  }

  function readNotebookConnectionClient() {
    if (globalScope.PlateThicknessNotebookConnectionClient) {
      return globalScope.PlateThicknessNotebookConnectionClient;
    }

    throw new Error("Plate Thickness notebook connection client is unavailable.");
  }

  function readNotebookSaveClient() {
    if (globalScope.PlateThicknessNotebookSaveClient) {
      return globalScope.PlateThicknessNotebookSaveClient;
    }

    throw new Error("Plate Thickness notebook save client is unavailable.");
  }

  function readPlateThicknessSaveModalApi() {
    if (globalScope.PlateThicknessSaveModal) {
      return globalScope.PlateThicknessSaveModal;
    }

    throw new Error("Plate Thickness save modal is unavailable.");
  }

  var api = {
    plateThicknessSaveRunnerCreate: plateThicknessSaveRunnerCreate,
  };

  globalScope.PlateThicknessSaveTarget = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

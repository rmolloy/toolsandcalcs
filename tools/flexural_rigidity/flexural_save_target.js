(function (globalScope) {
  function flexuralSaveRunnerCreate() {
    return {
      readFlexuralSaveSurface: readFlexuralSaveSurface,
      runFlexuralSaveAction: runFlexuralSaveAction,
    };
  }

  async function readFlexuralSaveSurface() {
    var connection = await readNotebookConnectionForFlexuralSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readFlexuralSaveSurfaceApi().readFlexuralSaveSurface();
  }

  async function runFlexuralSaveAction(request) {
    var surface = await readFlexuralSaveSurface();

    if (surface.mode === "lab-connected") {
      return await runConnectedFlexuralSaveAction(surface, request);
    }

    return await runOfflineFlexuralSaveAction(request);
  }

  async function runConnectedFlexuralSaveAction(surface, request) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForFlexuralSave(surface.workbookId);
    var selection = await readFlexuralSaveModalApi().openConnectedFlexuralSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: readFlexuralDefaultDisplayName(snapshot),
    });

    if (!selection) {
      return false;
    }

    var savePackage = readFlexuralSaveSurfaceApi().buildFlexuralSavePackage(snapshot);
    await readNotebookSaveClient().saveNotebookFlexuralCapture({
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

  async function runOfflineFlexuralSaveAction(request) {
    var savePackage = readFlexuralSaveSurfaceApi().buildFlexuralSavePackage(request.readSnapshot());
    readFlexuralSaveSurfaceApi().downloadFlexuralSavePackage({ document: globalScope.document, URL: globalScope.URL }, savePackage);
    request.setStatus("JSON package downloaded.");
    return Promise.resolve(true);
  }

  async function readNotebookConnectionForFlexuralSave() {
    if (!canRunConnectedFlexuralSave()) {
      return null;
    }

    return await readNotebookConnectionClient().readNotebookConnectionForFlexuralSave();
  }

  function canRunConnectedFlexuralSave() {
    return Boolean(
      globalScope.FlexuralNotebookConnectionClient &&
      globalScope.FlexuralNotebookSaveClient &&
      globalScope.FlexuralSaveModal
    );
  }

  function readFlexuralDefaultDisplayName(_snapshot) {
    return "Top Plate";
  }

  function readFlexuralSaveSurfaceApi() {
    if (globalScope.FlexuralSaveSurface) {
      return globalScope.FlexuralSaveSurface;
    }

    throw new Error("Flexural save surface is unavailable.");
  }

  function readNotebookConnectionClient() {
    if (globalScope.FlexuralNotebookConnectionClient) {
      return globalScope.FlexuralNotebookConnectionClient;
    }

    throw new Error("Flexural notebook connection client is unavailable.");
  }

  function readNotebookSaveClient() {
    if (globalScope.FlexuralNotebookSaveClient) {
      return globalScope.FlexuralNotebookSaveClient;
    }

    throw new Error("Flexural notebook save client is unavailable.");
  }

  function readFlexuralSaveModalApi() {
    if (globalScope.FlexuralSaveModal) {
      return globalScope.FlexuralSaveModal;
    }

    throw new Error("Flexural save modal is unavailable.");
  }

  var api = {
    flexuralSaveRunnerCreate: flexuralSaveRunnerCreate,
  };

  globalScope.FlexuralSaveTarget = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

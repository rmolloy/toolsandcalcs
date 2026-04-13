(function (globalScope) {
  function monopoleSaveRunnerCreate() {
    return {
      readMonopoleSaveSurface: readMonopoleSaveSurface,
      runMonopoleSaveAction: runMonopoleSaveAction,
    };
  }

  async function readMonopoleSaveSurface() {
    var connection = await readNotebookConnectionForMonopoleSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readMonopoleSaveSurfaceApi().readMonopoleSaveSurface();
  }

  async function runMonopoleSaveAction(request) {
    var surface = await readMonopoleSaveSurface();

    if (surface.mode === "lab-connected") {
      return await runConnectedMonopoleSaveAction(surface, request);
    }

    return await runOfflineMonopoleSaveAction(request);
  }

  async function readNotebookConnectionForMonopoleSave() {
    if (!canRunConnectedMonopoleSave()) {
      return null;
    }

    return await readNotebookConnectionClient().readNotebookConnectionForMonopoleSave();
  }

  function canRunConnectedMonopoleSave() {
    return Boolean(
      globalScope.MonopoleNotebookConnectionClient &&
      globalScope.MonopoleNotebookSaveClient &&
      globalScope.MonopoleSaveModal
    );
  }

  async function runConnectedMonopoleSaveAction(surface, request) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForMonopoleSave(surface.workbookId);
    var selection = await readMonopoleSaveModalApi().openConnectedMonopoleSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: snapshot.name,
    });

    if (!selection) {
      return false;
    }

    var savePackage = readMonopoleSaveSurfaceApi().buildMonopoleSavePackage(snapshot);
    await readNotebookSaveClient().saveNotebookMonopoleCapture({
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

  async function runOfflineMonopoleSaveAction(request) {
    var savePackage = readMonopoleSaveSurfaceApi().buildMonopoleSavePackage(request.readSnapshot());
    readMonopoleSaveSurfaceApi().downloadMonopoleSavePackage(globalScope, savePackage);
    request.setStatus("JSON package downloaded");
    return Promise.resolve(true);
  }

  function readMonopoleSaveSurfaceApi() {
    if (globalScope.MonopoleSaveSurface) {
      return globalScope.MonopoleSaveSurface;
    }

    throw new Error("Monopole save surface is unavailable.");
  }

  function readNotebookConnectionClient() {
    if (globalScope.MonopoleNotebookConnectionClient) {
      return globalScope.MonopoleNotebookConnectionClient;
    }

    throw new Error("Monopole notebook connection client is unavailable.");
  }

  function readNotebookSaveClient() {
    if (globalScope.MonopoleNotebookSaveClient) {
      return globalScope.MonopoleNotebookSaveClient;
    }

    throw new Error("Monopole notebook save client is unavailable.");
  }

  function readMonopoleSaveModalApi() {
    if (globalScope.MonopoleSaveModal) {
      return globalScope.MonopoleSaveModal;
    }

    throw new Error("Monopole save modal is unavailable.");
  }

  var api = {
    monopoleSaveRunnerCreate: monopoleSaveRunnerCreate,
  };

  globalScope.MonopoleSaveTarget = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

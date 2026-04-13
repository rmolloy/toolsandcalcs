(function (globalScope) {
  function dofSaveRunnerCreate() {
    return {
      readDofSaveSurface: readDofSaveSurface,
      runDofSaveAction: runDofSaveAction,
    };
  }

  async function readDofSaveSurface() {
    var connection = await readNotebookConnectionForDofSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readDofSaveSurfaceApi().readDofSaveSurface();
  }

  async function runDofSaveAction(request) {
    var surface = await readDofSaveSurface();

    if (surface.mode === "lab-connected") {
      return await runConnectedDofSaveAction(surface, request);
    }

    return await runOfflineDofSaveAction(request);
  }

  async function runConnectedDofSaveAction(surface, request) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForDofSave(surface.workbookId);
    var selection = await readDofSaveModalApi().openConnectedDofSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: readDofDefaultDisplayName(snapshot),
    });

    if (!selection) {
      return false;
    }

    var savePackage = readDofSaveSurfaceApi().buildDofSavePackage(snapshot);
    await readNotebookSaveClient().saveNotebookDofCapture({
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

  async function runOfflineDofSaveAction(request) {
    var savePackage = readDofSaveSurfaceApi().buildDofSavePackage(request.readSnapshot());
    readDofSaveSurfaceApi().downloadDofSavePackage(globalScope, savePackage);
    request.setStatus("JSON package downloaded.");
    return Promise.resolve(true);
  }

  async function readNotebookConnectionForDofSave() {
    if (!canRunConnectedDofSave()) {
      return null;
    }

    return await readNotebookConnectionClient().readNotebookConnectionForDofSave();
  }

  function canRunConnectedDofSave() {
    return Boolean(
      globalScope.DofNotebookConnectionClient &&
      globalScope.DofNotebookSaveClient &&
      globalScope.DofSaveModal
    );
  }

  function readDofDefaultDisplayName(_snapshot) {
    return "Instrument";
  }

  function readDofSaveSurfaceApi() {
    if (globalScope.DofSaveSurface) {
      return globalScope.DofSaveSurface;
    }

    throw new Error("DOF save surface is unavailable.");
  }

  function readNotebookConnectionClient() {
    if (globalScope.DofNotebookConnectionClient) {
      return globalScope.DofNotebookConnectionClient;
    }

    throw new Error("DOF notebook connection client is unavailable.");
  }

  function readNotebookSaveClient() {
    if (globalScope.DofNotebookSaveClient) {
      return globalScope.DofNotebookSaveClient;
    }

    throw new Error("DOF notebook save client is unavailable.");
  }

  function readDofSaveModalApi() {
    if (globalScope.DofSaveModal) {
      return globalScope.DofSaveModal;
    }

    throw new Error("DOF save modal is unavailable.");
  }

  var api = {
    dofSaveRunnerCreate: dofSaveRunnerCreate,
  };

  globalScope.DofSaveTarget = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

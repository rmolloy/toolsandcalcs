(function (globalScope) {
  function braceSaveRunnerCreate() {
    return {
      readBraceSaveSurface: readBraceSaveSurface,
      runBraceSaveAction: runBraceSaveAction,
    };
  }

  async function readBraceSaveSurface() {
    var connection = await readNotebookConnectionForBraceSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readBraceSaveSurfaceApi().readBraceSaveSurface();
  }

  async function runBraceSaveAction(request) {
    var surface = await readBraceSaveSurface();

    if (surface.mode === "lab-connected") {
      return await runConnectedBraceSaveAction(surface, request);
    }

    return await runOfflineBraceSaveAction(request);
  }

  async function runConnectedBraceSaveAction(surface, request) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForBraceSave(surface.workbookId);
    var selection = await readBraceSaveModalApi().openConnectedBraceSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: readBraceDefaultDisplayName(snapshot),
    });

    if (!selection) {
      return false;
    }

    var savePackage = readBraceSaveSurfaceApi().buildBraceSavePackage(snapshot);
    await readNotebookSaveClient().saveNotebookBraceCapture({
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

  async function runOfflineBraceSaveAction(request) {
    var savePackage = readBraceSaveSurfaceApi().buildBraceSavePackage(request.readSnapshot());
    readBraceSaveSurfaceApi().downloadBraceSavePackage({ document: globalScope.document, URL: globalScope.URL }, savePackage);
    request.setStatus("JSON package downloaded.");
    return Promise.resolve(true);
  }

  async function readNotebookConnectionForBraceSave() {
    if (!canRunConnectedBraceSave()) {
      return null;
    }

    return await readNotebookConnectionClient().readNotebookConnectionForBraceSave();
  }

  function canRunConnectedBraceSave() {
    return Boolean(
      globalScope.BraceNotebookConnectionClient &&
      globalScope.BraceNotebookSaveClient &&
      globalScope.BraceSaveModal
    );
  }

  function readBraceDefaultDisplayName(_snapshot) {
    return "Brace Stock";
  }

  function readBraceSaveSurfaceApi() {
    if (globalScope.BraceSaveSurface) {
      return globalScope.BraceSaveSurface;
    }

    throw new Error("Brace save surface is unavailable.");
  }

  function readNotebookConnectionClient() {
    if (globalScope.BraceNotebookConnectionClient) {
      return globalScope.BraceNotebookConnectionClient;
    }

    throw new Error("Brace notebook connection client is unavailable.");
  }

  function readNotebookSaveClient() {
    if (globalScope.BraceNotebookSaveClient) {
      return globalScope.BraceNotebookSaveClient;
    }

    throw new Error("Brace notebook save client is unavailable.");
  }

  function readBraceSaveModalApi() {
    if (globalScope.BraceSaveModal) {
      return globalScope.BraceSaveModal;
    }

    throw new Error("Brace save modal is unavailable.");
  }

  var api = {
    braceSaveRunnerCreate: braceSaveRunnerCreate,
  };

  globalScope.BraceSaveTarget = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

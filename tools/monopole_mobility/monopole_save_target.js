(function (globalScope) {
  function monopoleSaveRunnerCreate(options) {
    var messages = options && options.messages || {};
    return {
      readMonopoleSaveSurface: function () {
        return readMonopoleSaveSurface(messages);
      },
      runMonopoleSaveAction: function (request) {
        return runMonopoleSaveAction(request, messages);
      },
    };
  }

  async function readMonopoleSaveSurface(messages) {
    var connection = await readNotebookConnectionForMonopoleSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: messages.save || "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readMonopoleSaveSurfaceApi().readMonopoleSaveSurface(messages);
  }

  async function runMonopoleSaveAction(request, messages) {
    var surface = await readMonopoleSaveSurface(messages);

    if (surface.mode === "lab-connected") {
      return await runConnectedMonopoleSaveAction(surface, request, messages);
    }

    return await runOfflineMonopoleSaveAction(request, messages);
  }

  function readSaveSummary(request) {
    return typeof request.readSummary === "function" ? request.readSummary() : [];
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

  async function runConnectedMonopoleSaveAction(surface, request, messages) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForMonopoleSave(surface.workbookId);
    var selection = await readMonopoleSaveModalApi().openConnectedMonopoleSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: snapshot.name,
      messages: messages,
      summary: readSaveSummary(request),
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
    request.setStatus(formatSavedToNotebook(messages, surface.notebookName));
    return true;
  }

  async function runOfflineMonopoleSaveAction(request, messages) {
    var savePackage = readMonopoleSaveSurfaceApi().buildMonopoleSavePackage(request.readSnapshot());
    readMonopoleSaveSurfaceApi().downloadMonopoleSavePackage(globalScope, savePackage);
    request.setStatus(messages.jsonPackageDownloaded || "JSON package downloaded");
    return Promise.resolve(true);
  }

  function formatSavedToNotebook(messages, notebookName) {
    var message = messages.savedToNotebook || "Saved to {notebookName}.";
    return message.replace("{notebookName}", notebookName || messages.notebook || "Notebook");
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

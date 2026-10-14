(function (globalScope) {
  var DEFAULT_DOF_SAVE_MESSAGES = Object.freeze({
    connectedLabel: "Save",
    defaultDisplayName: "Instrument",
    defaultNotebookName: "Notebook",
    dialogLabel: "Save 4DOF Model",
    modelTitle: "4-DOF model",
    downloadHint: "Notebook saving is not available here. Download the model instead.",
    downloadLabel: "Download JSON",
    downloadedStatus: "JSON package downloaded.",
    savedToNotebookTemplate: "Saved to {notebookName}.",
  });

  function dofSaveRunnerCreate(messageOverrides) {
    var messages = readDofSaveMessages(messageOverrides);
    return {
      readDofSaveSurface: function () {
        return readDofSaveSurface(messages);
      },
      runDofSaveAction: function (request) {
        return runDofSaveAction(request, messages);
      },
    };
  }

  function readDofSaveMessages(messageOverrides) {
    var candidate = messageOverrides || {};
    return Object.fromEntries(
      Object.entries(DEFAULT_DOF_SAVE_MESSAGES).map(function (entry) {
        var key = entry[0];
        var fallback = entry[1];
        var value = candidate[key];
        return [key, typeof value === "string" && value.trim() ? value : fallback];
      }),
    );
  }

  async function readDofSaveSurface(messages) {
    var connection = await readNotebookConnectionForDofSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: messages.connectedLabel,
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readDofSaveSurfaceApi().readDofSaveSurface({
      downloadHint: messages.downloadHint,
      downloadLabel: messages.downloadLabel,
    });
  }

  async function runDofSaveAction(request, messages) {
    var surface = await readDofSaveSurface(messages);

    if (surface.mode === "lab-connected") {
      return await runConnectedDofSaveAction(surface, request, messages);
    }

    return await runOfflineDofSaveAction(request, messages);
  }

  async function runConnectedDofSaveAction(surface, request, messages) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForDofSave(surface.workbookId);
    var selection = await readDofSaveModalApi().openConnectedDofSaveModal({
      dialogLabel: messages.dialogLabel,
      title: messages.modelTitle,
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: readDofDefaultDisplayName(snapshot, messages),
      summary: readSaveSummary(request),
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
    request.setStatus(readDofSavedStatus(surface, messages));
    return true;
  }

  function readSaveSummary(request) {
    return typeof request.readSummary === "function" ? request.readSummary() : [];
  }

  async function runOfflineDofSaveAction(request, messages) {
    var savePackage = readDofSaveSurfaceApi().buildDofSavePackage(request.readSnapshot());
    readDofSaveSurfaceApi().downloadDofSavePackage(globalScope, savePackage);
    request.setStatus(messages.downloadedStatus);
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

  function readDofDefaultDisplayName(_snapshot, messages) {
    return messages.defaultDisplayName;
  }

  function readDofSavedStatus(surface, messages) {
    var notebookName = surface.notebookName || messages.defaultNotebookName;
    return messages.savedToNotebookTemplate.replace("{notebookName}", notebookName);
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

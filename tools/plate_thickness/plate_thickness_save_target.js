(function (globalScope) {
  function plateThicknessSaveRunnerCreate(options) {
    var messages = options && options.messages || {};
    return {
      readPlateThicknessSaveSurface: function () {
        return readPlateThicknessSaveSurface(messages);
      },
      runPlateThicknessSaveAction: function (request) {
        return runPlateThicknessSaveAction(request, messages);
      },
    };
  }

  async function readPlateThicknessSaveSurface(messages) {
    var connection = await readNotebookConnectionForPlateThicknessSave();

    if (connection) {
      return {
        mode: "lab-connected",
        label: messages.save || "Save",
        workbookId: connection.workbookId,
        notebookName: connection.notebookName,
      };
    }

    return readPlateThicknessSaveSurfaceApi().readPlateThicknessSaveSurface(messages);
  }

  async function runPlateThicknessSaveAction(request, messages) {
    var surface = await readPlateThicknessSaveSurface(messages);

    if (surface.mode === "lab-connected") {
      return await runConnectedPlateThicknessSaveAction(surface, request, messages);
    }

    return await runOfflinePlateThicknessSaveAction(request, messages);
  }

  async function runConnectedPlateThicknessSaveAction(surface, request, messages) {
    var snapshot = request.readSnapshot();
    var subjects = await readNotebookSaveClient().listNotebookSubjectsForPlateThicknessSave(surface.workbookId);
    var selection = await readPlateThicknessSaveModalApi().openConnectedPlateThicknessSaveModal({
      notebookName: surface.notebookName,
      subjects: subjects,
      defaultDisplayName: messages.plateStock || "Plate Stock",
      messages: messages,
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
    request.setStatus(formatSavedToNotebook(messages, surface.notebookName));
    return true;
  }

  async function runOfflinePlateThicknessSaveAction(request, messages) {
    var savePackage = readPlateThicknessSaveSurfaceApi().buildPlateThicknessSavePackage(request.readSnapshot());
    readPlateThicknessSaveSurfaceApi().downloadPlateThicknessSavePackage(globalScope, savePackage);
    request.setStatus(messages.jsonPackageDownloaded || "JSON package downloaded");
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

  function formatSavedToNotebook(messages, notebookName) {
    var message = messages.savedToNotebook || "Saved to {notebookName}.";
    return message.replace("{notebookName}", notebookName || messages.notebook || "Notebook");
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

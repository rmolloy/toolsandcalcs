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
        label: "Salvar",
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
    request.setStatus(formatBraceSavedStatus(surface.notebookName));
    return true;
  }

  function formatBraceSavedStatus(notebookName) {
    return "Salvo em {notebookName}.".replace(
      "{notebookName}",
      notebookName || "Caderno"
    );
  }

  async function runOfflineBraceSaveAction(request) {
    var savePackage = readBraceSaveSurfaceApi().buildBraceSavePackage(request.readSnapshot());
    readBraceSaveSurfaceApi().downloadBraceSavePackage({ document: globalScope.document, URL: globalScope.URL }, savePackage);
    request.setStatus("Pacote JSON baixado.");
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
    return "Madeira para barras";
  }

  function readBraceSaveSurfaceApi() {
    if (globalScope.BraceSaveSurface) {
      return globalScope.BraceSaveSurface;
    }

    throw new Error("A superfície de salvamento das barras não está disponível.");
  }

  function readNotebookConnectionClient() {
    if (globalScope.BraceNotebookConnectionClient) {
      return globalScope.BraceNotebookConnectionClient;
    }

    throw new Error("O cliente de conexão ao caderno das barras não está disponível.");
  }

  function readNotebookSaveClient() {
    if (globalScope.BraceNotebookSaveClient) {
      return globalScope.BraceNotebookSaveClient;
    }

    throw new Error("O cliente de salvamento das barras no caderno não está disponível.");
  }

  function readBraceSaveModalApi() {
    if (globalScope.BraceSaveModal) {
      return globalScope.BraceSaveModal;
    }

    throw new Error("A janela de salvamento das barras não está disponível.");
  }

  var api = {
    braceSaveRunnerCreate: braceSaveRunnerCreate,
  };

  globalScope.BraceSaveTarget = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

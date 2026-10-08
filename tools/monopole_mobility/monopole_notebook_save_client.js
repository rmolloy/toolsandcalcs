(function (globalScope) {
  function listNotebookSubjectsForMonopoleSave(workbookId) {
    return readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
  }

  function saveNotebookMonopoleCapture(args) {
    return readSharedNotebookRpcClient().saveNotebookStateCapture("saveMonopoleMobilityCapture", args || {});
  }

  function readSharedNotebookRpcClient() {
    if (globalScope.CommonNotebookRpcClient) {
      return globalScope.CommonNotebookRpcClient;
    }

    if (typeof require === "function") {
      return require("../common/notebook_rpc_client.js");
    }

    throw new Error("Common notebook rpc client is unavailable.");
  }

  var api = {
    listNotebookSubjectsForMonopoleSave: listNotebookSubjectsForMonopoleSave,
    saveNotebookMonopoleCapture: saveNotebookMonopoleCapture,
  };

  globalScope.MonopoleNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

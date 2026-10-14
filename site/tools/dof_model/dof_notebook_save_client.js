(function (globalScope) {
  function listNotebookSubjectsForDofSave(workbookId) {
    return readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
  }

  function saveNotebookDofCapture(args) {
    return readSharedNotebookRpcClient().saveNotebookStateCapture("saveDofModelCapture", args || {});
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
    listNotebookSubjectsForDofSave: listNotebookSubjectsForDofSave,
    saveNotebookDofCapture: saveNotebookDofCapture,
  };

  globalScope.DofNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

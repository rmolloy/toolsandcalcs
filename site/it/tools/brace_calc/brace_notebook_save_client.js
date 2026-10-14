(function (globalScope) {
  function listNotebookSubjectsForBraceSave(workbookId) {
    return readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
  }

  function saveNotebookBraceCapture(args) {
    return readSharedNotebookRpcClient().saveNotebookStateCapture("saveBraceCalculatorCapture", args || {});
  }

  function readSharedNotebookRpcClient() {
    if (globalScope.CommonNotebookRpcClient) {
      return globalScope.CommonNotebookRpcClient;
    }

    if (typeof require === "function") {
      return require("../../common/notebook_rpc_client.js");
    }

    throw new Error("Il client RPC comune del quaderno non è disponibile.");
  }

  var api = {
    listNotebookSubjectsForBraceSave: listNotebookSubjectsForBraceSave,
    saveNotebookBraceCapture: saveNotebookBraceCapture,
  };

  globalScope.BraceNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

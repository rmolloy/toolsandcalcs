(function (globalScope) {
  function listNotebookSubjectsForFlexuralSave(workbookId) {
    return readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
  }

  function saveNotebookFlexuralCapture(args) {
    return readSharedNotebookRpcClient().saveNotebookStateCapture("saveFlexuralRigidityCapture", args || {});
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
    listNotebookSubjectsForFlexuralSave: listNotebookSubjectsForFlexuralSave,
    saveNotebookFlexuralCapture: saveNotebookFlexuralCapture,
  };

  globalScope.FlexuralNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

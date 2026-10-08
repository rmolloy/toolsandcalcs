(function (globalScope) {
  function listNotebookSubjectsForPlateThicknessSave(workbookId) {
    return readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
  }

  function saveNotebookPlateThicknessCapture(args) {
    return readSharedNotebookRpcClient().saveNotebookStateCapture("savePlateThicknessCapture", args || {});
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
    listNotebookSubjectsForPlateThicknessSave: listNotebookSubjectsForPlateThicknessSave,
    saveNotebookPlateThicknessCapture: saveNotebookPlateThicknessCapture,
  };

  globalScope.PlateThicknessNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

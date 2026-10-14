(function (globalScope) {
  function readNotebookConnectionForBraceSave(fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookConnection({ fetchImpl: fetchImpl });
  }

  function readSharedNotebookRpcClient() {
    if (globalScope.CommonNotebookRpcClient) {
      return globalScope.CommonNotebookRpcClient;
    }

    if (typeof require === "function") {
      return require("../../common/notebook_rpc_client.js");
    }

    throw new Error("Der gemeinsame RPC-Client des Notizbuchs ist nicht verfügbar.");
  }

  var api = {
    readNotebookConnectionForBraceSave: readNotebookConnectionForBraceSave,
  };

  globalScope.BraceNotebookConnectionClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

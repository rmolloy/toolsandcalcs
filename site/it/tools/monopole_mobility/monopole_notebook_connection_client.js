(function (globalScope) {
  function readNotebookConnectionForMonopoleSave(fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookConnection({ fetchImpl: fetchImpl });
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
    readNotebookConnectionForMonopoleSave: readNotebookConnectionForMonopoleSave,
  };

  globalScope.MonopoleNotebookConnectionClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

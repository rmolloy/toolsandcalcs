(function (globalScope) {
  function readNotebookRestorePayloadForBrace(workbookId, eventId, fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
      fetchImpl: fetchImpl,
      fetchUnavailableMessage: "Brace notebook restore fetch is unavailable.",
    });
  }

  function readSharedNotebookRpcClient() {
    if (globalScope.CommonNotebookRpcClient) {
      return globalScope.CommonNotebookRpcClient;
    }

    if (typeof require === "function") {
      return require("../../common/notebook_rpc_client.js");
    }

    throw new Error("Common notebook rpc client is unavailable.");
  }

  var api = {
    readNotebookRestorePayloadForBrace: readNotebookRestorePayloadForBrace,
  };

  globalScope.BraceNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

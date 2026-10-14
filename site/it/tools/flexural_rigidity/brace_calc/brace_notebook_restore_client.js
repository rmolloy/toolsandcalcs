(function (globalScope) {
  function readNotebookRestorePayloadForBrace(workbookId, eventId, fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
      fetchImpl: fetchImpl,
      fetchUnavailableMessage: "La richiesta di ripristino del quaderno delle catene non è disponibile.",
    });
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
    readNotebookRestorePayloadForBrace: readNotebookRestorePayloadForBrace,
  };

  globalScope.BraceNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

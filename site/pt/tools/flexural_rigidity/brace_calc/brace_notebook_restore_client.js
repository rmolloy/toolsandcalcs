(function (globalScope) {
  function readNotebookRestorePayloadForBrace(workbookId, eventId, fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
      fetchImpl: fetchImpl,
      fetchUnavailableMessage: "A consulta de restauração do caderno das barras não está disponível.",
    });
  }

  function readSharedNotebookRpcClient() {
    if (globalScope.CommonNotebookRpcClient) {
      return globalScope.CommonNotebookRpcClient;
    }

    if (typeof require === "function") {
      return require("../../common/notebook_rpc_client.js");
    }

    throw new Error("O cliente RPC comum do caderno não está disponível.");
  }

  var api = {
    readNotebookRestorePayloadForBrace: readNotebookRestorePayloadForBrace,
  };

  globalScope.BraceNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

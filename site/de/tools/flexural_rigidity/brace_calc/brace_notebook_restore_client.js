(function (globalScope) {
  function readNotebookRestorePayloadForBrace(workbookId, eventId, fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
      fetchImpl: fetchImpl,
      fetchUnavailableMessage: "Der Abruf zur Wiederherstellung des Leisten-Notizbuchs ist nicht verfügbar.",
    });
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
    readNotebookRestorePayloadForBrace: readNotebookRestorePayloadForBrace,
  };

  globalScope.BraceNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

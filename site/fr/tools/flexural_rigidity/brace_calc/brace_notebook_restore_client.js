(function (globalScope) {
  function readNotebookRestorePayloadForBrace(workbookId, eventId, fetchImpl) {
    return readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
      fetchImpl: fetchImpl,
      fetchUnavailableMessage: "La requête de restauration du carnet des barres n'est pas disponible.",
    });
  }

  function readSharedNotebookRpcClient() {
    if (globalScope.CommonNotebookRpcClient) {
      return globalScope.CommonNotebookRpcClient;
    }

    if (typeof require === "function") {
      return require("../../common/notebook_rpc_client.js");
    }

    throw new Error("Le client RPC commun du carnet n'est pas disponible.");
  }

  var api = {
    readNotebookRestorePayloadForBrace: readNotebookRestorePayloadForBrace,
  };

  globalScope.BraceNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

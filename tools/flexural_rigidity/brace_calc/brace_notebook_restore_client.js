(function (globalScope) {
  async function readNotebookRestorePayloadForBrace(workbookId, eventId, fetchImpl) {
    var response = await readBraceFetch(fetchImpl)("/notebook-api/rpc.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        method: "readToolRestorePayload",
        workbookId: workbookId,
        payload: { eventId: eventId },
      }),
    });
    var payload = await response.json();

    if (!response.ok) {
      throw new Error(String(payload && payload.message || "Notebook restore failed."));
    }

    return payload || {};
  }

  function readBraceFetch(fetchImpl) {
    if (typeof fetchImpl === "function") {
      return fetchImpl;
    }

    if (typeof globalScope.fetch === "function") {
      return globalScope.fetch.bind(globalScope);
    }

    throw new Error("Brace notebook restore fetch is unavailable.");
  }

  var api = {
    readNotebookRestorePayloadForBrace: readNotebookRestorePayloadForBrace,
  };

  globalScope.BraceNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

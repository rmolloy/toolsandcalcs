(function (globalScope) {
  async function readNotebookRestorePayloadForMonopole(workbookId, eventId, fetchImpl) {
    var response = await readMonopoleFetch(fetchImpl)("/notebook-api/rpc.php", {
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

  function readMonopoleFetch(fetchImpl) {
    if (typeof fetchImpl === "function") {
      return fetchImpl;
    }

    if (typeof globalScope.fetch === "function") {
      return globalScope.fetch.bind(globalScope);
    }

    throw new Error("Monopole notebook restore fetch is unavailable.");
  }

  var api = {
    readNotebookRestorePayloadForMonopole: readNotebookRestorePayloadForMonopole,
  };

  globalScope.MonopoleNotebookRestoreClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

(function (globalScope) {
  async function readNotebookConnectionForBraceSave(fetchImpl) {
    var fetchApi = typeof fetchImpl === "function" ? fetchImpl : globalScope.fetch;

    if (typeof fetchApi !== "function") {
      return null;
    }

    try {
      var response = await fetchApi("/notebook-api/rpc.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ method: "readDefaultWorkbookConnection" }),
      });

      if (!response.ok) {
        return null;
      }

      return readNotebookConnectionPayload(await response.json());
    } catch (_error) {
      return null;
    }
  }

  function readNotebookConnectionPayload(payload) {
    var workbookId = String(payload && payload.workbookId || "").trim();

    if (!workbookId) {
      return null;
    }

    return {
      workbookId: workbookId,
      notebookName: String(payload && payload.notebookName || "").trim(),
    };
  }

  var api = {
    readNotebookConnectionForBraceSave: readNotebookConnectionForBraceSave,
  };

  globalScope.BraceNotebookConnectionClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

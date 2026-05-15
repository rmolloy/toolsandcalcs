(function (globalScope) {
  async function readNotebookConnectionForBraceSave(fetchImpl) {
    var fetchApi = typeof fetchImpl === "function" ? fetchImpl : globalScope.fetch;

    if (typeof fetchApi !== "function") {
      return null;
    }

    if (!fetchImpl && shouldSkipNotebookConnectionProbe()) {
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

  function shouldSkipNotebookConnectionProbe() {
    var location = globalScope.location;

    if (!location) {
      return false;
    }

    if (location.protocol === "file:") {
      return true;
    }

    return isRawStaticPreviewServer(location);
  }

  function isRawStaticPreviewServer(location) {
    var isLoopbackHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";

    return isLoopbackHost && location.port === "8090";
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

(function (globalScope) {
  async function readNotebookConnectionForFlexuralSave(fetchImpl) {
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

      var payload = await response.json();

      if (!payload || !payload.workbookId) {
        return null;
      }

      return {
        workbookId: String(payload.workbookId || ""),
        notebookName: String(payload.notebookName || ""),
      };
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

  var api = {
    readNotebookConnectionForFlexuralSave: readNotebookConnectionForFlexuralSave,
  };

  globalScope.FlexuralNotebookConnectionClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

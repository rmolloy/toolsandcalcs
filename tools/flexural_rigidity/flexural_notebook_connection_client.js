(function (globalScope) {
  async function readNotebookConnectionForFlexuralSave() {
    var response = await globalScope.fetch("/notebook-api/rpc.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ method: "readDefaultWorkbookConnection" }),
    });
    var payload = await response.json();

    if (!response.ok) {
      throw new Error(String(payload && payload.message || "Notebook connection is unavailable."));
    }

    if (!payload || !payload.workbookId) {
      return null;
    }

    return {
      workbookId: String(payload.workbookId || ""),
      notebookName: String(payload.notebookName || ""),
    };
  }

  var api = {
    readNotebookConnectionForFlexuralSave: readNotebookConnectionForFlexuralSave,
  };

  globalScope.FlexuralNotebookConnectionClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

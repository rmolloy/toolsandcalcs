(function (globalScope) {
  async function listNotebookSubjectsForMonopoleSave(workbookId) {
    var response = await callMonopoleNotebookRpc("listSubjects", {
      workbookId: workbookId,
    });
    return Array.isArray(response) ? response : [];
  }

  async function saveNotebookMonopoleCapture(args) {
    return await callMonopoleNotebookRpc("saveMonopoleMobilityCapture", {
      workbookId: args.workbookId,
      payload: {
        subject: args.subject,
        event: args.event,
        package: {
          stateJson: String(args.package && args.package.stateJson || ""),
        },
      },
    });
  }

  async function callMonopoleNotebookRpc(method, request) {
    var response = await globalScope.fetch("/notebook-api/rpc.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(Object.assign({ method: method }, request || {})),
    });
    var payload = await response.json();

    if (!response.ok) {
      throw new Error(String(payload && payload.message || "Notebook save failed."));
    }

    return payload;
  }

  var api = {
    listNotebookSubjectsForMonopoleSave: listNotebookSubjectsForMonopoleSave,
    saveNotebookMonopoleCapture: saveNotebookMonopoleCapture,
  };

  globalScope.MonopoleNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

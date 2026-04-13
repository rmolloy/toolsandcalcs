(function (globalScope) {
  async function listNotebookSubjectsForDofSave(workbookId) {
    var response = await callDofNotebookRpc("listSubjects", {
      workbookId: workbookId,
    });
    return Array.isArray(response) ? response : [];
  }

  async function saveNotebookDofCapture(args) {
    return await callDofNotebookRpc("saveDofModelCapture", {
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

  async function callDofNotebookRpc(method, request) {
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
    listNotebookSubjectsForDofSave: listNotebookSubjectsForDofSave,
    saveNotebookDofCapture: saveNotebookDofCapture,
  };

  globalScope.DofNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

(function (globalScope) {
  async function listNotebookSubjectsForFlexuralSave(workbookId) {
    var response = await callFlexuralNotebookRpc("listSubjects", {
      workbookId: workbookId,
    });
    return Array.isArray(response) ? response : [];
  }

  async function saveNotebookFlexuralCapture(args) {
    return await callFlexuralNotebookRpc("saveFlexuralRigidityCapture", {
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

  async function callFlexuralNotebookRpc(method, request) {
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
    listNotebookSubjectsForFlexuralSave: listNotebookSubjectsForFlexuralSave,
    saveNotebookFlexuralCapture: saveNotebookFlexuralCapture,
  };

  globalScope.FlexuralNotebookSaveClient = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

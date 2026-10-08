(function (globalScope) {
  function openConnectedMonopoleSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Save Monopole Mobility",
      title: settings.title || "Monopole mobility",
      summary: settings.summary,
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "GUITAR",
        subtypeKey: "",
        displayNamePlaceholder: settings.defaultDisplayName || "Bench OM",
      },
    });
  }

  function readSharedNotebookSaveModal() {
    if (globalScope.CommonNotebookSaveModal) {
      return globalScope.CommonNotebookSaveModal;
    }

    if (typeof require === "function") {
      return require("../common/notebook_save_modal.js");
    }

    throw new Error("Common notebook save modal is unavailable.");
  }

  var api = {
    openConnectedMonopoleSaveModal: openConnectedMonopoleSaveModal,
  };

  globalScope.MonopoleSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

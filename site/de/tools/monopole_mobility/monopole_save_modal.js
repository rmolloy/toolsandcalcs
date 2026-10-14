(function (globalScope) {
  function openConnectedMonopoleSaveModal(args) {
    var settings = args || {};
    var messages = settings.messages || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: messages.saveMonopoleMobility || "Save Monopole Mobility",
      title: settings.title || messages.monopoleMobility || "Monopole mobility",
      summary: settings.summary,
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "GUITAR",
        subtypeKey: "",
        displayNamePlaceholder: settings.defaultDisplayName || messages.benchOm || "Bench OM",
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

(function (globalScope) {
  function openConnectedDofSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Save 4DOF Model",
      title: settings.title || "4-DOF model",
      summary: settings.summary,
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "GUITAR",
        subtypeKey: "",
        displayNamePlaceholder: settings.defaultDisplayName || "Instrument",
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
    openConnectedDofSaveModal: openConnectedDofSaveModal,
  };

  globalScope.DofSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

(function (globalScope) {
  function openConnectedBraceSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Leistenanordnung speichern",
      title: settings.title || "Leistenanordnung",
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "BRACE_STOCK",
        displayNamePlaceholder: settings.defaultDisplayName || "Leistenholz",
      },
    });
  }

  function readSharedNotebookSaveModal() {
    if (globalScope.CommonNotebookSaveModal) {
      return globalScope.CommonNotebookSaveModal;
    }

    if (typeof require === "function") {
      return require("../../common/notebook_save_modal.js");
    }

    throw new Error("Der gemeinsame Speicherdialog für das Notizbuch ist nicht verfügbar.");
  }

  var api = {
    openConnectedBraceSaveModal: openConnectedBraceSaveModal,
  };

  globalScope.BraceSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

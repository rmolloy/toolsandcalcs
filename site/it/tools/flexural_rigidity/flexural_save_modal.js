(function (globalScope) {
  // localized-runtime-messages:start
  var flexuralSaveModalMessages = Object.freeze({
    dialogLabel: "Salva rigidezza flessionale",
    defaultTitle: "Rigidezza flessionale",
    defaultDisplayName: "Tavola armonica"
  });
  // localized-runtime-messages:end

  function openConnectedFlexuralSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: flexuralSaveModalMessages.dialogLabel,
      title: settings.title || flexuralSaveModalMessages.defaultTitle,
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "PLATE_STOCK",
        displayNamePlaceholder: settings.defaultDisplayName || flexuralSaveModalMessages.defaultDisplayName,
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
    openConnectedFlexuralSaveModal: openConnectedFlexuralSaveModal,
  };

  globalScope.FlexuralSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

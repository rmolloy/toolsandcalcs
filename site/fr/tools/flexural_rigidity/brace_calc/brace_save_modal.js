(function (globalScope) {
  function openConnectedBraceSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Enregistrer le barrage",
      title: settings.title || "Barrage",
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "BRACE_STOCK",
        displayNamePlaceholder: settings.defaultDisplayName || "Bois pour barres",
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

    throw new Error("La boîte de dialogue commune d'enregistrement dans le carnet n'est pas disponible.");
  }

  var api = {
    openConnectedBraceSaveModal: openConnectedBraceSaveModal,
  };

  globalScope.BraceSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

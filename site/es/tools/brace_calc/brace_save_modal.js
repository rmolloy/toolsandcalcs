(function (globalScope) {
  function openConnectedBraceSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Guardar disposición de varetas",
      title: settings.title || "Disposición de varetas",
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "BRACE_STOCK",
        displayNamePlaceholder: settings.defaultDisplayName || "Madera para varetas",
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

    throw new Error("El diálogo común de guardado en el cuaderno no está disponible.");
  }

  var api = {
    openConnectedBraceSaveModal: openConnectedBraceSaveModal,
  };

  globalScope.BraceSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

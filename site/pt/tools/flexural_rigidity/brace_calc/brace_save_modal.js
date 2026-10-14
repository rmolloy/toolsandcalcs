(function (globalScope) {
  function openConnectedBraceSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Salvar disposição das barras",
      title: settings.title || "Disposição das barras",
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "BRACE_STOCK",
        displayNamePlaceholder: settings.defaultDisplayName || "Madeira para barras",
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

    throw new Error("A janela comum de salvamento no caderno não está disponível.");
  }

  var api = {
    openConnectedBraceSaveModal: openConnectedBraceSaveModal,
  };

  globalScope.BraceSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

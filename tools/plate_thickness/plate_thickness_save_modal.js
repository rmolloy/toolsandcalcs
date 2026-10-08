(function (globalScope) {
  function openConnectedPlateThicknessSaveModal(args) {
    var settings = args || {};
    return readSharedNotebookSaveModal().openNotebookSaveModal({
      dialogLabel: "Save Plate Thickness",
      title: settings.title || "Plate thickness",
      notebookName: settings.notebookName,
      subjects: settings.subjects,
      packageFiles: ["state.json"],
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "PLATE_STOCK",
        displayNamePlaceholder: settings.defaultDisplayName || "Plate Stock",
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
    openConnectedPlateThicknessSaveModal: openConnectedPlateThicknessSaveModal,
  };

  globalScope.PlateThicknessSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

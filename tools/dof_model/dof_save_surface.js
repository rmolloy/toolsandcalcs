(function (globalScope) {
  function readSharedOfflineSaveSurface() {
    if (globalScope.CommonOfflineSaveSurface) return globalScope.CommonOfflineSaveSurface;
    if (typeof require === "function") return require("../common/offline_save_surface.js");
    throw new Error("Common offline save surface is unavailable.");
  }

  function readSharedToolDocument() {
    if (globalScope.CommonToolDocument) return globalScope.CommonToolDocument;
    if (typeof require === "function") return require("../common/tool_document.js");
    throw new Error("Common tool document helpers are unavailable.");
  }

  function readSharedToolDocumentFile() {
    if (globalScope.CommonToolDocumentFile) return globalScope.CommonToolDocumentFile;
    if (typeof require === "function") return require("../common/tool_document_file.js");
    throw new Error("Common tool document file helpers are unavailable.");
  }

  function readDofSaveSurface() {
    return readSharedOfflineSaveSurface().readOfflineDownloadSaveSurface({
      label: "Download JSON",
      hint: "Notebook saving is not available here. Download the model instead.",
    });
  }

  function buildDofSavePackage(snapshot, now) {
    var exportedAt = readDofSaveTimestamp(now);
    return {
      filename: "dof-model-" + buildDofSaveTimestampToken(exportedAt) + ".json",
      text: JSON.stringify(buildDofSavePayload(snapshot, exportedAt), null, 2),
    };
  }

  function downloadDofSavePackage(runtime, savePackage) {
    readSharedOfflineSaveSurface().downloadTextSaveFile(runtime, {
      filename: String(savePackage && savePackage.filename || "dof-model.json"),
      mimeType: "application/json",
      text: String(savePackage && savePackage.text || ""),
    });
  }

  async function readDofSavePackageFile(file) {
    return readDofSavePackageDocument(await readSharedToolDocumentFile().readJsonDocumentFromFile(file));
  }

  function readDofSavePackageDocument(value) {
    var documentValue = value || {};
    var type = String(documentValue.toolDocumentType || documentValue.packageType || "").trim();
    if (type !== "DOF_MODEL_SAVE" && type !== "DOF_MODEL_EXPORT") {
      throw new Error("This file is not a DOF Model save.");
    }
    return {
      params: documentValue.params || {},
      modelOrder: Number(documentValue.modelOrder || 4),
      taskMode: String(documentValue.taskMode || "edit").trim() || "edit",
      overlayEnabled: Boolean(documentValue.overlayEnabled),
      fitInputs: documentValue.fitInputs || {},
      solveOptions: documentValue.solveOptions || {},
    };
  }

  function buildDofSavePayload(snapshot, exportedAt) {
    var source = snapshot || {};
    return {
      ...readSharedToolDocument().buildToolDocumentHeader({
        toolDocumentType: "DOF_MODEL_SAVE",
        toolId: "dof_model",
        savedAtIso: exportedAt,
      }),
      packageType: "DOF_MODEL_EXPORT",
      packageVersion: 1,
      exportedAtIso: exportedAt,
      params: source.params || {},
      modelOrder: Number(source.modelOrder || 4),
      taskMode: String(source.taskMode || "edit").trim() || "edit",
      overlayEnabled: Boolean(source.overlayEnabled),
      fitInputs: source.fitInputs || {},
      solveOptions: source.solveOptions || {},
    };
  }

  function readDofSaveTimestamp(now) {
    var date = now instanceof Date ? now : new Date();
    return date.toISOString();
  }

  function buildDofSaveTimestampToken(exportedAt) {
    return String(exportedAt || "").replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  var api = {
    buildDofSavePackage: buildDofSavePackage,
    downloadDofSavePackage: downloadDofSavePackage,
    readDofSavePackageDocument: readDofSavePackageDocument,
    readDofSavePackageFile: readDofSavePackageFile,
    readDofSaveSurface: readDofSaveSurface,
  };

  globalScope.DofSaveSurface = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

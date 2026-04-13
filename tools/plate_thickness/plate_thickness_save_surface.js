(function (globalScope) {
  function readSharedOfflineSaveSurface() {
    if (globalScope.CommonOfflineSaveSurface) {
      return globalScope.CommonOfflineSaveSurface;
    }

    if (typeof require === "function") {
      return require("../common/offline_save_surface.js");
    }

    throw new Error("Common offline save surface is unavailable.");
  }

  function readSharedToolDocument() {
    if (globalScope.CommonToolDocument) {
      return globalScope.CommonToolDocument;
    }

    if (typeof require === "function") {
      return require("../common/tool_document.js");
    }

    throw new Error("Common tool document helpers are unavailable.");
  }

  function readSharedToolDocumentFile() {
    if (globalScope.CommonToolDocumentFile) {
      return globalScope.CommonToolDocumentFile;
    }

    if (typeof require === "function") {
      return require("../common/tool_document_file.js");
    }

    throw new Error("Common tool document file helpers are unavailable.");
  }

  function readPlateThicknessSaveSurface() {
    return readSharedOfflineSaveSurface().readOfflineDownloadSaveSurface({
      label: "Download JSON",
      hint: "Notebook saving is not available here. Download the export instead.",
    });
  }

  function buildPlateThicknessSavePackage(snapshot, now) {
    var exportedAt = readPlateThicknessSaveTimestamp(now);
    return {
      filename: "plate-thickness-" + buildPlateThicknessSaveTimestampToken(exportedAt) + ".json",
      text: JSON.stringify(buildPlateThicknessSavePayload(snapshot, exportedAt), null, 2),
    };
  }

  function downloadPlateThicknessSavePackage(runtime, savePackage) {
    readSharedOfflineSaveSurface().downloadTextSaveFile(runtime, {
      filename: String(savePackage && savePackage.filename || "plate-thickness.json"),
      mimeType: "application/json",
      text: String(savePackage && savePackage.text || ""),
    });
  }

  async function readPlateThicknessSavePackageFile(file) {
    return readPlateThicknessSavePackageDocument(
      await readSharedToolDocumentFile().readJsonDocumentFromFile(file)
    );
  }

  function readPlateThicknessSavePackageDocument(value) {
    var documentValue = value || {};
    var type = String(documentValue.toolDocumentType || documentValue.packageType || "").trim();

    if (type !== "PLATE_THICKNESS_SAVE" && type !== "PLATE_THICKNESS_EXPORT") {
      throw new Error("This file is not a Plate Thickness save.");
    }

    return {
      inputs: documentValue.inputs || {},
      results: documentValue.results || {},
    };
  }

  function buildPlateThicknessSavePayload(snapshot, exportedAt) {
    var source = snapshot || {};
    return {
      ...readSharedToolDocument().buildToolDocumentHeader({
        toolDocumentType: "PLATE_THICKNESS_SAVE",
        toolId: "plate_thickness",
        savedAtIso: exportedAt,
      }),
      packageType: "PLATE_THICKNESS_EXPORT",
      packageVersion: 1,
      exportedAtIso: exportedAt,
      inputs: source.inputs || {},
      results: source.results || {},
    };
  }

  function readPlateThicknessSaveTimestamp(now) {
    var date = now instanceof Date ? now : new Date();
    return date.toISOString();
  }

  function buildPlateThicknessSaveTimestampToken(exportedAt) {
    return String(exportedAt || "")
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  var api = {
    buildPlateThicknessSavePackage: buildPlateThicknessSavePackage,
    downloadPlateThicknessSavePackage: downloadPlateThicknessSavePackage,
    readPlateThicknessSavePackageDocument: readPlateThicknessSavePackageDocument,
    readPlateThicknessSavePackageFile: readPlateThicknessSavePackageFile,
    readPlateThicknessSaveSurface: readPlateThicknessSaveSurface,
  };

  globalScope.PlateThicknessSaveSurface = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

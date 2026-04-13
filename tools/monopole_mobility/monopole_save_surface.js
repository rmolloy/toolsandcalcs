(function (globalScope) {
  function readSharedToolDocumentFile() {
    if (globalScope.CommonToolDocumentFile) {
      return globalScope.CommonToolDocumentFile;
    }

    if (typeof require === "function") {
      return require("../common/tool_document_file.js");
    }

    throw new Error("Common tool document file helpers are unavailable.");
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

  function readSharedOfflineSaveSurface() {
    if (globalScope.CommonOfflineSaveSurface) {
      return globalScope.CommonOfflineSaveSurface;
    }

    if (typeof require === "function") {
      return require("../common/offline_save_surface.js");
    }

    throw new Error("Common offline save surface is unavailable.");
  }

  function readMonopoleSaveSurface() {
    return readSharedOfflineSaveSurface().readOfflineDownloadSaveSurface({
      label: "Download JSON",
      hint: "Notebook saving is not available here. Download the export instead.",
    });
  }

  function buildMonopoleSavePackage(snapshot, now) {
    var exportedAt = readMonopoleSaveTimestamp(now);
    return {
      filename: buildMonopoleSaveFilename(snapshot, exportedAt),
      text: JSON.stringify(buildMonopoleSavePayload(snapshot, exportedAt), null, 2),
    };
  }

  function downloadMonopoleSavePackage(runtime, savePackage) {
    readSharedOfflineSaveSurface().downloadTextSaveFile(runtime, {
      filename: String(savePackage && savePackage.filename || "monopole-mobility.json"),
      mimeType: "application/json",
      text: String(savePackage && savePackage.text || ""),
    });
  }

  async function readMonopoleSavePackageFile(file) {
    return readMonopoleSavePackageDocument(
      await readSharedToolDocumentFile().readJsonDocumentFromFile(file)
    );
  }

  function readMonopoleSavePackageDocument(value) {
    var documentValue = value || {};
    var type = String(documentValue.toolDocumentType || documentValue.packageType || "").trim();

    if (!isMonopoleSaveDocumentType(type)) {
      throw new Error("This file is not a Monopole Mobility save.");
    }

    return {
      name: readMonopoleSaveInstrumentName(documentValue),
      type: readMonopoleSaveInstrumentType(documentValue),
      mode: readMonopoleSaveMode(documentValue),
      inputs: readMonopoleSaveInputs(documentValue),
      outputs: readMonopoleSaveOutputs(documentValue),
    };
  }

  function buildMonopoleSavePayload(snapshot, exportedAt) {
    var source = snapshot || {};
    return {
      ...readSharedToolDocument().buildToolDocumentHeader({
        toolDocumentType: "MONOPOLE_MOBILITY_SAVE",
        toolId: "monopole_mobility",
        savedAtIso: exportedAt,
      }),
      packageType: "MONOPOLE_MOBILITY_EXPORT",
      packageVersion: 1,
      exportedAtIso: exportedAt,
      instrument: {
        name: String(source.name || "").trim(),
        type: String(source.type || "").trim(),
      },
      calculationMode: String(source.mode || "").trim(),
      inputs: source.inputs || {},
      outputs: source.outputs || {},
    };
  }

  function isMonopoleSaveDocumentType(value) {
    return value === "MONOPOLE_MOBILITY_SAVE" || value === "MONOPOLE_MOBILITY_EXPORT";
  }

  function readMonopoleSaveInstrumentName(value) {
    return String(value.instrument && value.instrument.name || "Untitled sample").trim() || "Untitled sample";
  }

  function readMonopoleSaveInstrumentType(value) {
    return String(value.instrument && value.instrument.type || "other").trim() || "other";
  }

  function readMonopoleSaveMode(value) {
    return String(value.calculationMode || "").trim() === "dynamic" ? "dynamic" : "static";
  }

  function readMonopoleSaveInputs(value) {
    return value.inputs || {};
  }

  function readMonopoleSaveOutputs(value) {
    return value.outputs || {};
  }

  function buildMonopoleSaveFilename(snapshot, exportedAt) {
    var instrumentName = readMonopoleSaveFileStem(snapshot);
    return instrumentName + "-" + buildMonopoleSaveTimestampToken(exportedAt) + ".json";
  }

  function readMonopoleSaveFileStem(snapshot) {
    var instrumentName = sanitizeMonopoleSaveName(snapshot && snapshot.name);

    if (instrumentName) {
      return instrumentName + "-monopole-mobility";
    }

    return "monopole-mobility";
  }

  function sanitizeMonopoleSaveName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function readMonopoleSaveTimestamp(now) {
    var date = now instanceof Date ? now : new Date();
    return date.toISOString();
  }

  function buildMonopoleSaveTimestampToken(exportedAt) {
    return String(exportedAt || "")
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  var api = {
    buildMonopoleSavePackage: buildMonopoleSavePackage,
    downloadMonopoleSavePackage: downloadMonopoleSavePackage,
    readMonopoleSavePackageDocument: readMonopoleSavePackageDocument,
    readMonopoleSavePackageFile: readMonopoleSavePackageFile,
    readMonopoleSaveSurface: readMonopoleSaveSurface,
  };

  globalScope.MonopoleSaveSurface = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

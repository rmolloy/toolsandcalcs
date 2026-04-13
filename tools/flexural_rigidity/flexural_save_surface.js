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

  function readFlexuralSaveSurface() {
    return readSharedOfflineSaveSurface().readOfflineDownloadSaveSurface({
      label: "Download JSON",
      hint: "Notebook saving is not available here. Download the flexural state instead.",
    });
  }

  function buildFlexuralSavePackage(snapshot, now) {
    var exportedAt = readFlexuralSaveTimestamp(now);
    return {
      filename: "flexural-rigidity-" + buildFlexuralSaveTimestampToken(exportedAt) + ".json",
      text: JSON.stringify(buildFlexuralSavePayload(snapshot, exportedAt), null, 2),
    };
  }

  function downloadFlexuralSavePackage(runtime, savePackage) {
    readSharedOfflineSaveSurface().downloadTextSaveFile(runtime, {
      filename: String(savePackage && savePackage.filename || "flexural-rigidity.json"),
      mimeType: "application/json",
      text: String(savePackage && savePackage.text || ""),
    });
  }

  async function readFlexuralSavePackageFile(file) {
    return readFlexuralSavePackageDocument(
      await readSharedToolDocumentFile().readJsonDocumentFromFile(file)
    );
  }

  function readFlexuralSavePackageDocument(value) {
    if (Array.isArray(value)) {
      return { top: {}, braces: value };
    }

    var documentValue = value || {};
    var type = String(documentValue.toolDocumentType || documentValue.packageType || "").trim();

    if (isFlexuralSaveDocumentType(type)) {
      return {
        top: readFlexuralTopSnapshot(documentValue.top),
        braces: readFlexuralBraceSnapshot(documentValue.braces),
      };
    }

    if (Array.isArray(documentValue.braces)) {
      return {
        top: readFlexuralTopSnapshot(documentValue.top),
        braces: readFlexuralBraceSnapshot(documentValue.braces),
      };
    }

    throw new Error("This file is not a Flexural Rigidity save.");
  }

  function buildFlexuralSavePayload(snapshot, exportedAt) {
    var source = snapshot || {};
    return {
      ...readSharedToolDocument().buildToolDocumentHeader({
        toolDocumentType: "FLEXURAL_RIGIDITY_SAVE",
        toolId: "flexural_rigidity",
        savedAtIso: exportedAt,
      }),
      packageType: "FLEXURAL_RIGIDITY_EXPORT",
      packageVersion: 1,
      exportedAtIso: exportedAt,
      top: readFlexuralTopSnapshot(source.top),
      braces: readFlexuralBraceSnapshot(source.braces),
    };
  }

  function isFlexuralSaveDocumentType(value) {
    return value === "FLEXURAL_RIGIDITY_SAVE" || value === "FLEXURAL_RIGIDITY_EXPORT";
  }

  function readFlexuralTopSnapshot(value) {
    var top = value || {};
    return {
      span: readFlexuralNumber(top.span),
      thickness: readFlexuralNumber(top.thickness),
      modulus: readFlexuralNumber(top.modulus),
    };
  }

  function readFlexuralBraceSnapshot(value) {
    return Array.isArray(value) ? value : [];
  }

  function readFlexuralNumber(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function readFlexuralSaveTimestamp(now) {
    var date = now instanceof Date ? now : new Date();
    return date.toISOString();
  }

  function buildFlexuralSaveTimestampToken(exportedAt) {
    return String(exportedAt || "")
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  var api = {
    buildFlexuralSavePackage: buildFlexuralSavePackage,
    downloadFlexuralSavePackage: downloadFlexuralSavePackage,
    readFlexuralSavePackageDocument: readFlexuralSavePackageDocument,
    readFlexuralSavePackageFile: readFlexuralSavePackageFile,
    readFlexuralSaveSurface: readFlexuralSaveSurface,
  };

  globalScope.FlexuralSaveSurface = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

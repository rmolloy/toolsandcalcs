(function (globalScope) {
  function readSharedOfflineSaveSurface() {
    if (globalScope.CommonOfflineSaveSurface) {
      return globalScope.CommonOfflineSaveSurface;
    }

    if (typeof require === "function") {
      return require("../../common/offline_save_surface.js");
    }

    throw new Error("A superfície comum de salvamento offline não está disponível.");
  }

  function readSharedToolDocumentFile() {
    if (globalScope.CommonToolDocumentFile) {
      return globalScope.CommonToolDocumentFile;
    }

    if (typeof require === "function") {
      return require("../../common/tool_document_file.js");
    }

    throw new Error("Os auxiliares comuns de arquivos de ferramentas não estão disponíveis.");
  }

  function readSharedToolDocument() {
    if (globalScope.CommonToolDocument) {
      return globalScope.CommonToolDocument;
    }

    if (typeof require === "function") {
      return require("../../common/tool_document.js");
    }

    throw new Error("Os auxiliares comuns de documentos de ferramentas não estão disponíveis.");
  }

  function readBraceSaveSurface() {
    return readSharedOfflineSaveSurface().readOfflineDownloadSaveSurface({
      label: "Baixar JSON",
      hint: "O salvamento no caderno não está disponível aqui. Baixe a disposição das barras em vez disso.",
    });
  }

  function buildBraceSavePackage(braces, now) {
    var savedAt = readBraceSaveTimestamp(now);
    return {
      filename: "brace-layout-" + buildBraceSaveTimestampToken(savedAt) + ".json",
      text: JSON.stringify(readBraceSavePayload(braces, savedAt), null, 2),
    };
  }

  function downloadBraceSavePackage(runtime, savePackage) {
    readSharedOfflineSaveSurface().downloadTextSaveFile(runtime, {
      filename: String(savePackage && savePackage.filename || "brace-layout.json"),
      mimeType: "application/json",
      text: String(savePackage && savePackage.text || ""),
    });
  }

  async function readBraceSavePackageFile(file) {
    return readBraceSavePackageDocument(
      await readSharedToolDocumentFile().readJsonDocumentFromFile(file)
    );
  }

  function readBraceSavePackageDocument(value) {
    if (Array.isArray(value)) {
      return value;
    }

    var documentValue = value || {};
    var type = String(documentValue.toolDocumentType || documentValue.packageType || "").trim();

    if (isBraceSaveDocumentType(type) && Array.isArray(documentValue.braces)) {
      return documentValue.braces;
    }

    if (!type && Array.isArray(documentValue.braces)) {
      return documentValue.braces;
    }

    throw new Error("Este arquivo não contém uma disposição de barras.");
  }

  function readBraceSavePayload(braces, savedAt) {
    return {
      ...readSharedToolDocument().buildToolDocumentHeader({
        toolDocumentType: "BRACE_CALCULATOR_SAVE",
        toolId: "brace_calculator",
        savedAtIso: savedAt,
      }),
      packageType: "BRACE_LAYOUT_EXPORT",
      packageVersion: 1,
      exportedAtIso: savedAt,
      braces: Array.isArray(braces) ? braces : [],
    };
  }

  function isBraceSaveDocumentType(value) {
    return value === "BRACE_CALCULATOR_SAVE" || value === "BRACE_LAYOUT_EXPORT";
  }

  function readBraceSaveTimestamp(now) {
    var date = now instanceof Date ? now : new Date();
    return date.toISOString();
  }

  function buildBraceSaveTimestampToken(savedAt) {
    return String(savedAt || "")
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  var api = {
    buildBraceSavePackage: buildBraceSavePackage,
    downloadBraceSavePackage: downloadBraceSavePackage,
    readBraceSavePackageDocument: readBraceSavePackageDocument,
    readBraceSavePackageFile: readBraceSavePackageFile,
    readBraceSaveSurface: readBraceSaveSurface,
  };

  globalScope.BraceSaveSurface = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

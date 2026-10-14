(function (globalScope) {
  function buildToolDocumentHeader(args) {
    var source = args || {};
    return {
      toolDocumentType: String(source.toolDocumentType || "").trim(),
      toolDocumentVersion: Number(source.toolDocumentVersion || 1),
      toolId: String(source.toolId || "").trim(),
      toolVersion: readToolDocumentVersion(source.toolVersion),
      savedAtIso: String(source.savedAtIso || "").trim(),
    };
  }

  function readToolDocumentVersion(value) {
    var version = String(value || "").trim();
    return version || undefined;
  }

  function isToolDocumentHeader(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      typeof value.toolDocumentType === "string" &&
      typeof value.toolDocumentVersion === "number" &&
      typeof value.toolId === "string" &&
      typeof value.savedAtIso === "string"
    );
  }

  var api = {
    buildToolDocumentHeader: buildToolDocumentHeader,
    isToolDocumentHeader: isToolDocumentHeader,
  };

  globalScope.CommonToolDocument = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

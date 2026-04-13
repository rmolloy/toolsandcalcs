(function (globalScope) {
  function readOfflineDownloadSaveSurface(options) {
    var settings = options || {};
    return {
      mode: "offline",
      label: String(settings.label || "Download Package"),
      hint: String(settings.hint || "Notebook saving is not available here. Download the package instead."),
    };
  }

  function downloadTextSaveFile(runtime, args) {
    var documentRef = runtime && runtime.document;
    var urlApi = runtime && runtime.URL;

    if (!documentRef || !urlApi || typeof documentRef.createElement !== "function") {
      throw new Error("Save download is unavailable.");
    }

    var blob = new Blob([String(args && args.text || "")], {
      type: String(args && args.mimeType || "text/plain"),
    });
    var url = urlApi.createObjectURL(blob);
    var anchor = documentRef.createElement("a");
    anchor.href = url;
    anchor.download = String(args && args.filename || "download.txt");
    anchor.style.display = "none";
    (documentRef.body || documentRef.documentElement).appendChild(anchor);
    anchor.click();
    anchor.remove();
    urlApi.revokeObjectURL(url);
  }

  var api = {
    downloadTextSaveFile: downloadTextSaveFile,
    readOfflineDownloadSaveSurface: readOfflineDownloadSaveSurface,
  };

  globalScope.CommonOfflineSaveSurface = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

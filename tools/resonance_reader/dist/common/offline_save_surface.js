export function readOfflineDownloadSaveSurface(options) {
    const settings = options || {};
    return {
        mode: "offline",
        label: String(settings.label || "Download Package"),
        hint: String(settings.hint || "Notebook saving is not available here. Download the package instead."),
    };
}
export function downloadTextSaveFile(runtime, args) {
    const documentRef = runtime?.document;
    const urlApi = runtime?.URL;
    if (!documentRef || !urlApi || typeof documentRef.createElement !== "function") {
        throw new Error("Save download is unavailable.");
    }
    const blob = new Blob([String(args?.text || "")], {
        type: String(args?.mimeType || "text/plain"),
    });
    const url = urlApi.createObjectURL(blob);
    const anchor = documentRef.createElement("a");
    anchor.href = url;
    anchor.download = String(args?.filename || "download.txt");
    anchor.style.display = "none";
    (documentRef.body || documentRef.documentElement).appendChild(anchor);
    anchor.click();
    anchor.remove();
    urlApi.revokeObjectURL(url);
}

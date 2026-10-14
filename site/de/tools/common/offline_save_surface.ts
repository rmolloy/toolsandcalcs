export type OfflineDownloadSaveSurface = {
  mode: "offline";
  label: string;
  hint: string;
};

type DownloadUrlApi = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
};

type DownloadRuntime = {
  document: Document;
  URL: DownloadUrlApi;
};

export function readOfflineDownloadSaveSurface(
  options?: { label?: string; hint?: string },
): OfflineDownloadSaveSurface {
  const settings = options || {};
  return {
    mode: "offline",
    label: String(settings.label || "Download Package"),
    hint: String(settings.hint || "Notebook saving is not available here. Download the package instead."),
  };
}

export function downloadTextSaveFile(
  runtime: DownloadRuntime,
  args: { filename: string; text: string; mimeType?: string },
): void {
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

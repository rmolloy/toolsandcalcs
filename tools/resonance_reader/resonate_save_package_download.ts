import { resonanceCapturePackageZipBlobBuild } from "./resonate_capture_package.js";

export async function downloadResonanceCapturePackage(args: {
  state: Record<string, any>;
  recordingLabel: string;
  plotElement: HTMLElement | null;
}): Promise<void> {
  const savedAt = new Date().toISOString();
  const packageBlob = await resonanceCapturePackageZipBlobBuild({
    toolVersion: resonanceReaderToolVersionRead(),
    savedAtIso: savedAt,
    recordingLabel: args.recordingLabel,
    state: args.state,
    plotElement: args.plotElement,
  });

  resonanceCaptureBlobDownload({
    blob: packageBlob,
    filename: `${resonanceCaptureFilenameStemBuild(args.recordingLabel, savedAt)}.zip`,
  });
}

function resonanceReaderToolVersionRead(): string {
  return (document.documentElement?.dataset?.toolVersion || "dev").trim() || "dev";
}

function resonanceCaptureBlobDownload(args: { blob: Blob; filename: string }): void {
  const url = URL.createObjectURL(args.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = args.filename;
  document.body?.appendChild(anchor);
  anchor.click();
  if (typeof anchor.remove === "function") {
    anchor.remove();
  } else {
    document.body?.removeChild?.(anchor);
  }
  URL.revokeObjectURL(url);
}

function resonanceCaptureFilenameStemBuild(recordingLabel: string, savedAtIso: string): string {
  const label = resonanceCaptureFilenameLabelBuild(recordingLabel);
  const timestamp = savedAtIso.replace(/[:]/g, "-").replace(/\.\d{3}Z$/, "Z");
  return `${label}-${timestamp}`;
}

function resonanceCaptureFilenameLabelBuild(recordingLabel: string): string {
  const normalized = recordingLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "resonance-capture";
}

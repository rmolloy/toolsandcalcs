export type ToolDocumentHeader = {
  toolDocumentType: string;
  toolDocumentVersion: number;
  toolId: string;
  toolVersion?: string;
  savedAtIso: string;
};

export function buildToolDocumentHeader(args: {
  toolDocumentType: string;
  toolDocumentVersion?: number;
  toolId: string;
  toolVersion?: string;
  savedAtIso: string;
}): ToolDocumentHeader {
  return {
    toolDocumentType: String(args.toolDocumentType || "").trim(),
    toolDocumentVersion: Number(args.toolDocumentVersion || 1),
    toolId: String(args.toolId || "").trim(),
    toolVersion: readToolDocumentVersion(args.toolVersion),
    savedAtIso: String(args.savedAtIso || "").trim(),
  };
}

export function isToolDocumentHeader(value: unknown): value is ToolDocumentHeader {
  const candidate = value as Partial<ToolDocumentHeader> | null;
  return Boolean(
    candidate &&
    typeof candidate === "object" &&
    typeof candidate.toolDocumentType === "string" &&
    typeof candidate.toolDocumentVersion === "number" &&
    typeof candidate.toolId === "string" &&
    typeof candidate.savedAtIso === "string",
  );
}

function readToolDocumentVersion(value: unknown): string | undefined {
  const version = String(value || "").trim();
  return version || undefined;
}

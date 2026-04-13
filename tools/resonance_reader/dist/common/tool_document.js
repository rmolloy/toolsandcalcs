export function buildToolDocumentHeader(args) {
    return {
        toolDocumentType: String(args.toolDocumentType || "").trim(),
        toolDocumentVersion: Number(args.toolDocumentVersion || 1),
        toolId: String(args.toolId || "").trim(),
        toolVersion: readToolDocumentVersion(args.toolVersion),
        savedAtIso: String(args.savedAtIso || "").trim(),
    };
}
export function isToolDocumentHeader(value) {
    const candidate = value;
    return Boolean(candidate &&
        typeof candidate === "object" &&
        typeof candidate.toolDocumentType === "string" &&
        typeof candidate.toolDocumentVersion === "number" &&
        typeof candidate.toolId === "string" &&
        typeof candidate.savedAtIso === "string");
}
function readToolDocumentVersion(value) {
    const version = String(value || "").trim();
    return version || undefined;
}

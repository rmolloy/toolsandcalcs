export function overlayBoundaryEnsure(boundary) {
    if (!boundary) {
        throw new Error("[Resonance Reader] overlay boundary missing");
    }
    return boundary;
}

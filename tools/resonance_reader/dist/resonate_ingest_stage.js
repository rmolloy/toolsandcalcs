export const RESONATE_INGEST_STAGE_FLAG = {
    name: "resonate_ingest_stage",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove ingest stage flag once ingest is default",
};
export async function ingestStageRun(source, deps) {
    if (!source)
        return null;
    if (source.file && deps.handleFile) {
        await deps.handleFile(source.file);
        const current = deps.getCurrentWave?.() || null;
        const wave = current?.wave || current?.samples || null;
        const sampleRate = current?.sampleRate || null;
        if (wave && Number.isFinite(sampleRate)) {
            return { wave, sampleRate: sampleRate, sourceKind: source.sourceKind || "file" };
        }
        return null;
    }
    if (source.wave && Number.isFinite(source.sampleRate)) {
        return {
            wave: source.wave,
            sampleRate: source.sampleRate,
            sourceKind: source.sourceKind || "mic",
        };
    }
    return null;
}
if (typeof window !== "undefined") {
    window.ResonateIngestStage = {
        RESONATE_INGEST_STAGE_FLAG,
        ingestStageRun,
    };
}

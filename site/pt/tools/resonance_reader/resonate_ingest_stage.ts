type IngestStageFlag = {
  name: string;
  owner: string;
  defaultValue: boolean;
  rolloutMode: "off" | "on" | "percentage" | "cohort" | "input-class";
  removalCondition: string;
  removalTask: string;
};

type IngestSource = {
  file?: File | null;
  wave?: Float32Array | number[] | null;
  sampleRate?: number | null;
  sourceKind?: "file" | "mic" | "range" | "unknown";
};

type IngestResult = {
  wave: Float32Array | number[];
  sampleRate: number;
  sourceKind: "file" | "mic" | "range" | "unknown";
};

type IngestDeps = {
  handleFile?: (file: File) => Promise<void>;
  getCurrentWave?: () => { wave?: Float32Array | number[]; samples?: Float32Array | number[]; sampleRate?: number } | null;
};

export const RESONATE_INGEST_STAGE_FLAG: IngestStageFlag = {
  name: "resonate_ingest_stage",
  owner: "resonate",
  defaultValue: true,
  rolloutMode: "on",
  removalCondition: "after parity is proven",
  removalTask: "remove ingest stage flag once ingest is default",
};

export async function ingestStageRun(source: IngestSource | null | undefined, deps: IngestDeps): Promise<IngestResult | null> {
  if (!source) return null;
  if (source.file && deps.handleFile) {
    await deps.handleFile(source.file);
    const current = deps.getCurrentWave?.() || null;
    const wave = current?.wave || current?.samples || null;
    const sampleRate = current?.sampleRate || null;
    if (wave && Number.isFinite(sampleRate)) {
      return { wave, sampleRate: sampleRate as number, sourceKind: source.sourceKind || "file" };
    }
    return null;
  }
  if (source.wave && Number.isFinite(source.sampleRate)) {
    return {
      wave: source.wave,
      sampleRate: source.sampleRate as number,
      sourceKind: source.sourceKind || "mic",
    };
  }
  return null;
}

if (typeof window !== "undefined") {
  (window as any).ResonateIngestStage = {
    RESONATE_INGEST_STAGE_FLAG,
    ingestStageRun,
  };
}

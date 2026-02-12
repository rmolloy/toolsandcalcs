import { noteSegmentationBuildFromWave } from "./resonate_note_segmentation.js";
import type { AnalysisBoundary } from "./resonate_analysis_boundary.js";
import type { SignalBoundary } from "./resonate_signal_boundary.js";
import type { OverlayBoundary } from "./resonate_overlay_boundary.js";
import type { NoteResultState, NoteSliceState, ResonanceBoundaryState } from "./resonate_boundary_state.js";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js";
import { waveformStageRun } from "./resonate_stage_waveform.js";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js";
import { createPipelineBus } from "./resonate_pipeline_bus.js";

type PipelineRunnerDeps = {
  state: Record<string, any> & import("./resonate_boundary_state.js").ResonanceBoundaryState;
  refreshAll: () => Promise<void>;
  analysisBoundary?: AnalysisBoundary;
  signalBoundary?: SignalBoundary;
  overlayBoundary?: OverlayBoundary;
};

type PipelineEvent = {
  eventId: string;
  eventType: string;
  timestampIso: string;
  runId: string;
  stageId?: string;
  payload: Record<string, unknown>;
};

type PipelineEmit = (event: PipelineEvent) => void;

type PipelineStageId =
  | "ingest"
  | "waveform"
  | "segment.notes"
  | "refresh"
  | "solve.dof"
  | "stage.events"
  | "artifact";

type PipelineStageContext = {
  input: Record<string, unknown>;
  runId: string;
  emit: PipelineEmit;
  deps: PipelineRunnerDeps;
};

function pipelineBoundariesSeedIntoState(state: ResonanceBoundaryState, deps: PipelineRunnerDeps) {
  resonanceBoundarySeedIntoState(state, {
    analysis: deps.analysisBoundary,
    signal: deps.signalBoundary,
    overlay: deps.overlayBoundary,
  });
}


async function pipelineStageNoteSegmentationRun(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "segment.notes" }, "segment.notes");
  const { wave, sampleRate } = pipelineNoteSegmentationInputBuild(deps);
  if (!wave || !Number.isFinite(sampleRate)) {
    pipelineNoteSegmentationResetState(deps.state);
    pipelineStageSegmentNotesSkippedEmit(emit, runId);
    return;
  }
  const notes = await noteSegmentationBuildFromWave(wave, sampleRate as number);
  pipelineNoteSegmentationApplyToState(notes, deps.state);
  pipelineNotesReadyEmit(emit, runId, notes);
  pipelineStageSegmentNotesCompletedEmit(emit, runId, notes.slices.length);
}

function pipelineNoteSegmentationInputBuild(deps: PipelineRunnerDeps) {
  const src = deps.state?.currentWave;
  const wave = src?.wave || src?.samples || null;
  const sampleRate = src?.sampleRate;
  return { wave, sampleRate };
}

function pipelineNoteSegmentationResetState(state: ResonanceBoundaryState) {
  state.noteSlices = [];
  state.noteResults = [];
}

function pipelineNoteSegmentationApplyToState(
  notes: { slices: NoteSliceState[]; results: NoteResultState[] },
  state: ResonanceBoundaryState,
) {
  state.noteSlices = notes.slices;
  state.noteResults = notes.results;
}

function pipelineNotesReadyEmit(
  emit: PipelineEmit,
  runId: string,
  notes: { slices: NoteSliceState[]; results: NoteResultState[] },
) {
  pipelineRunnerEventEmit(emit, "notes.ready", runId, { notes }, "segment.notes");
}

function pipelineStageSegmentNotesCompletedEmit(
  emit: PipelineEmit,
  runId: string,
  noteCount: number,
) {
  pipelineRunnerEventEmit(
    emit,
    "stage.completed",
    runId,
    { stage: "segment.notes", noteCount },
    "segment.notes",
  );
}

function pipelineStageSegmentNotesSkippedEmit(
  emit: PipelineEmit,
  runId: string,
) {
  pipelineRunnerEventEmit(
    emit,
    "stage.completed",
    runId,
    { stage: "segment.notes", skipped: true },
    "segment.notes",
  );
}

function buildPipelineEvent(
  eventType: string,
  runId: string,
  payload: Record<string, unknown>,
  stageId?: string,
): PipelineEvent {
  return {
    eventId: pipelineEventIdBuild(runId),
    eventType,
    timestampIso: pipelineTimestampIsoBuild(),
    runId,
    stageId,
    payload,
  };
}

function pipelineEventIdBuild(runId: string) {
  return `${runId}_${Math.random().toString(36).slice(2, 8)}`;
}

function pipelineTimestampIsoBuild() {
  return new Date().toISOString();
}

function pipelineRunnerEventEmit(
  emit: PipelineEmit,
  eventType: string,
  runId: string,
  payload: Record<string, unknown>,
  stageId?: string,
) {
  emit(buildPipelineEvent(eventType, runId, payload, stageId));
}

function pipelineEmitWithStageTimingBuild(emit: PipelineEmit) {
  const stageStartMsById = new Map<string, number>();
  return (event: PipelineEvent) => {
    pipelineStageTimingCaptureFromEvent(stageStartMsById, event);
    emit(event);
  };
}

function pipelineStageTimingCaptureFromEvent(
  stageStartMsById: Map<string, number>,
  event: PipelineEvent,
) {
  const stageId = pipelineStageTimingKeySelectFromEvent(event);
  if (!stageId) return;
  if (event.eventType === "stage.started") {
    stageStartMsById.set(stageId, Date.now());
    return;
  }
  if (event.eventType === "stage.completed") {
    const startMs = stageStartMsById.get(stageId);
    if (!Number.isFinite(startMs)) return;
    console.info("[Resonance Reader] stage.completed ms", stageId, Date.now() - startMs);
  }
}

function pipelineStageTimingKeySelectFromEvent(event: PipelineEvent) {
  const payloadStage = (event.payload as { stage?: string } | null)?.stage;
  return event.stageId || payloadStage || null;
}

function pipelineStartEventEmit(
  emit: PipelineEmit,
  runId: string,
  input: Record<string, unknown>,
  config: Record<string, unknown>,
) {
  pipelineRunnerEventEmit(emit, "pipeline.started", runId, { input, config });
}

function pipelineRunIdBuild() {
  return `resonate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pipelineStageIdsSelectFromConfig(config: Record<string, unknown>): PipelineStageId[] {
  const useStageList = (config as { useStageList?: boolean } | null)?.useStageList;
  const stages = (config as { stages?: string[] } | null)?.stages || null;
  const defaultStages = pipelineDefaultStageIdsBuild();
  if (!useStageList || !Array.isArray(stages) || !stages.length) return defaultStages;
  return pipelineStageIdsFilterAllowed(stages, defaultStages);
}

function pipelineDefaultStageIdsBuild(): PipelineStageId[] {
  return [
    "ingest",
    "waveform",
    "segment.notes",
    "refresh",
    "solve.dof",
    "stage.events",
    "artifact",
  ];
}

function pipelineStageIdsFilterAllowed(
  stages: string[],
  allowedStages: PipelineStageId[],
): PipelineStageId[] {
  const allowed = new Set<PipelineStageId>(allowedStages);
  return stages.filter((stage): stage is PipelineStageId => allowed.has(stage as PipelineStageId));
}

function pipelineEmitAdapterBuild(emit: PipelineEmit) {
  return (
    eventType: string,
    run: string,
    payload: Record<string, unknown>,
    stageId?: string,
  ) => {
    pipelineRunnerEventEmit(emit, eventType, run, payload, stageId);
  };
}

async function pipelineStageRunById(stageId: PipelineStageId, ctx: PipelineStageContext) {
  if (stageId === "ingest") {
    await pipelineStageIngestRunWithTiming(ctx.input, ctx.runId, ctx.emit, ctx.deps);
    return;
  }
  if (stageId === "waveform") {
    pipelineStageWaveformRunWithTiming(ctx.runId, ctx.emit, ctx.deps);
    return;
  }
  if (stageId === "segment.notes") {
    await pipelineStageNoteSegmentationRunWithTiming(ctx.runId, ctx.emit, ctx.deps);
    return;
  }
  if (stageId === "refresh") {
    await pipelineStageRefreshRunWithTiming(ctx.runId, ctx.emit, ctx.deps);
    return;
  }
  if (stageId === "solve.dof") {
    pipelineStageSolveDofRunWithTiming(ctx.runId, ctx.emit, ctx.deps);
    return;
  }
  if (stageId === "stage.events") {
    pipelineStageEventsEmitWithTiming(ctx.runId, ctx.emit, ctx.deps);
    return;
  }
  if (stageId === "artifact") {
    pipelineArtifactEventEmitWithTiming(ctx.runId, ctx.emit, ctx.deps);
  }
}

async function pipelineStagesEventExecute(
  stageIds: PipelineStageId[],
  ctx: PipelineStageContext,
) {
  const stageBus = createPipelineBus();
  stageBus.wire("stage.execute", pipelineStageExecuteHandleBuild(ctx));
  for (const stageId of stageIds) {
    await stageBus.emit("stage.execute", { stageId });
  }
}

function pipelineStageExecuteHandleBuild(ctx: PipelineStageContext) {
  return async (payload: unknown) => {
    const stageId = (payload as { stageId?: PipelineStageId } | null)?.stageId;
    if (!stageId) return;
    await pipelineStageRunById(stageId, ctx);
  };
}

async function pipelineStageIngestRun(
  input: Record<string, unknown>,
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  pipelineStageIngestStartedEmit(emit, runId);
  const ingestApi = (window as any).ResonateIngestStage;
  const ingest = ingestApi?.ingestStageRun;
  if (!ingestApi?.RESONATE_INGEST_STAGE_FLAG?.defaultValue || typeof ingest !== "function") {
    pipelineStageIngestSkippedEmit(emit, runId);
    return;
  }
  const result = await ingest(input?.source, pipelineIngestDepsBuild());
  if (result?.wave && Number.isFinite(result.sampleRate)) {
    deps.state.currentWave = { wave: result.wave, sampleRate: result.sampleRate };
  }
  pipelineStageIngestCompletedEmit(emit, runId);
}

function pipelineStageIngestStartedEmit(emit: PipelineEmit, runId: string) {
  pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "ingest" }, "ingest");
}

function pipelineStageIngestSkippedEmit(emit: PipelineEmit, runId: string) {
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "ingest", skipped: true }, "ingest");
}

function pipelineStageIngestCompletedEmit(emit: PipelineEmit, runId: string) {
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "ingest" }, "ingest");
}

function pipelineIngestDepsBuild() {
  return {
    handleFile: (file: File) => (window as any).FFTAudio?.handleFile?.(file),
    getCurrentWave: () => (window as any).FFTState?.currentWave || null,
  };
}

async function pipelineStageRefreshRun(runId: string, emit: PipelineEmit, deps: PipelineRunnerDeps) {
  pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "refresh" }, "refresh");
  await deps.refreshAll();
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "refresh" }, "refresh");
}

function pipelineStageSolveDofRun(runId: string, emit: PipelineEmit, deps: PipelineRunnerDeps) {
  pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "solve.dof" }, "solve.dof");
  stageSolveDofRun({ state: deps.state });
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "solve.dof" }, "solve.dof");
}

function pipelineStageEventsEmit(runId: string, emit: PipelineEmit, deps: PipelineRunnerDeps) {
  const stageApi = (window as any).ResonateStageEvents;
  if (!stageApi?.RESONATE_STAGE_EVENT_FLAG?.defaultValue) return;
  const summary = stageApi.stageEventSummaryBuildFromState(deps.state);
  pipelineStageSummaryEventsEmit(runId, emit, summary);
}

function pipelineStageSummaryEventsEmit(
  runId: string,
  emit: PipelineEmit,
  summary: unknown,
) {
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "preprocess", summary }, "preprocess");
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "segment", summary }, "segment");
  pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "tap.analyze", summary }, "tap.analyze");
}

function pipelineArtifactEventEmit(runId: string, emit: PipelineEmit, deps: PipelineRunnerDeps) {
  const artifactApi = (window as any).ResonateArtifactEvent;
  if (!artifactApi?.RESONATE_ARTIFACT_EVENT_FLAG?.defaultValue) return;
  const summary = artifactApi.artifactSummaryBuildFromState(deps.state);
  const payload = pipelineArtifactPayloadBuildFromState(summary, deps.state);
  pipelineRunnerEventEmit(emit, "artifact.emitted", runId, payload, "artifact");
}

function pipelineArtifactPayloadBuildFromState(
  summary: unknown,
  state: ResonanceBoundaryState,
): Record<string, unknown> {
  const renderApi = (window as any).ResonateRenderEvents;
  const renderPayload =
    renderApi?.RESONATE_RENDER_EVENT_FLAG?.defaultValue && renderApi?.renderPayloadBuildFromState
      ? renderApi.renderPayloadBuildFromState(state)
      : null;
  const payload: Record<string, unknown> = { summary };
  if (renderPayload) payload.renderPayload = renderPayload;
  return payload;
}

function pipelineCompletedEventEmit(
  emit: PipelineEmit,
  runId: string,
  trigger: unknown,
) {
  pipelineRunnerEventEmit(emit, "pipeline.completed", runId, { summary: { trigger } });
}

function pipelineFailedEventEmit(
  emit: PipelineEmit,
  runId: string,
  err: unknown,
) {
  pipelineRunnerEventEmit(emit, "pipeline.failed", runId, { error: String(err) });
}

function pipelineTotalTimingLog(pipelineStartMs: number) {
  console.info("[Resonance Reader] pipeline.total ms", Date.now() - pipelineStartMs);
}

async function pipelineRunnerExecute(
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const runId = pipelineRunIdBuild();
  const pipelineStartMs = Date.now();
  const emitWithTiming = pipelineEmitWithStageTimingBuild(emit);
  const stageIds = pipelineStageIdsSelectFromConfig(config);
  pipelineBoundariesSeedIntoState(deps.state, deps);
  pipelineStartEventEmit(emitWithTiming, runId, input, config);
  try {
    await pipelineStagesEventExecute(
      stageIds,
      pipelineStageContextBuild(input, runId, emitWithTiming, deps),
    );

    pipelineTotalTimingLog(pipelineStartMs);
    pipelineCompletedEventEmit(emitWithTiming, runId, input?.trigger || null);
  } catch (err) {
    pipelineTotalTimingLog(pipelineStartMs);
    pipelineFailedEventEmit(emitWithTiming, runId, err);
    throw err;
  }
}

function pipelineStageContextBuild(
  input: Record<string, unknown>,
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
): PipelineStageContext {
  return { input, runId, emit, deps };
}

async function pipelineStageNoteSegmentationRunWithTiming(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const noteSegStartMs = Date.now();
  await pipelineStageNoteSegmentationRun(runId, emit, deps);
  void noteSegStartMs;
}

async function pipelineStageRefreshRunWithTiming(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const refreshStartMs = Date.now();
  await pipelineStageRefreshRun(runId, emit, deps);
  void refreshStartMs;
}

function pipelineStageSolveDofRunWithTiming(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const solveStartMs = Date.now();
  pipelineStageSolveDofRun(runId, emit, deps);
  void solveStartMs;
}

function pipelineStageEventsEmitWithTiming(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const stageEventsStartMs = Date.now();
  pipelineStageEventsEmit(runId, emit, deps);
  void stageEventsStartMs;
}

function pipelineArtifactEventEmitWithTiming(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const artifactStartMs = Date.now();
  pipelineArtifactEventEmit(runId, emit, deps);
  void artifactStartMs;
}
function pipelineStageWaveformRunWithTiming(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const waveformStartMs = Date.now();
  waveformStageRun(runId, pipelineEmitAdapterBuild(emit), deps);
  void waveformStartMs;
}
async function pipelineStageIngestRunWithTiming(
  input: Record<string, unknown>,
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const ingestStartMs = Date.now();
  await pipelineStageIngestRun(input, runId, emit, deps);
  void ingestStartMs;
}

export function pipelineRunnerRun(
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  return pipelineRunnerExecute(input, config, emit, deps);
}

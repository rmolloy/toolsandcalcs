import { noteSegmentationBuildFromWave } from "./resonate_note_segmentation.js";
import type { AnalysisBoundary } from "./resonate_analysis_boundary.js";
import type { SignalBoundary } from "./resonate_signal_boundary.js";
import type { OverlayBoundary } from "./resonate_overlay_boundary.js";
import type { NoteResultState, NoteSliceState, ResonanceBoundaryState } from "./resonate_boundary_state.js";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js";
import { waveformStageRun } from "./resonate_stage_waveform.js";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js";
import {
  pipelineEventEmit as pipelineRunnerEventEmit,
  pipelineStageIdsResolveFromConfig,
  type PipelineRuntimeEmit as PipelineEmit,
} from "../common/pipeline_runtime.js";
import { pipelineStageTimingEmitWithCaptureBuild } from "../common/pipeline_stage_timing.js";
import { pipelineStageIdsExecuteSequential } from "../common/pipeline_stage_executor.js";
import { pipelineRunWithLifecycle } from "../common/pipeline_lifecycle.js";
import { pipelineEmitAdapterBuild } from "../common/pipeline_emit_adapter.js";
import {
  pipelineStageCompletedEmit,
  pipelineStageStartedEmit,
} from "../common/pipeline_stage_events.js";

type PipelineRunnerDeps = {
  state: Record<string, any> & import("./resonate_boundary_state.js").ResonanceBoundaryState;
  refreshAll: () => Promise<void>;
  analysisBoundary?: AnalysisBoundary;
  signalBoundary?: SignalBoundary;
  overlayBoundary?: OverlayBoundary;
};

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
  pipelineStageStartedEmit(emit, runId, "segment.notes");
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
  pipelineStageCompletedEmit(emit, runId, "segment.notes", { noteCount });
}

function pipelineStageSegmentNotesSkippedEmit(
  emit: PipelineEmit,
  runId: string,
) {
  pipelineStageCompletedEmit(emit, runId, "segment.notes", { skipped: true });
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

function pipelineStageHandlersBuild(ctx: PipelineStageContext) {
  return {
    ingest: () => pipelineStageIngestRun(ctx.input, ctx.runId, ctx.emit, ctx.deps),
    waveform: () => Promise.resolve(pipelineStageWaveformRun(ctx.runId, ctx.emit, ctx.deps)),
    "segment.notes": () => pipelineStageNoteSegmentationRun(ctx.runId, ctx.emit, ctx.deps),
    refresh: () => pipelineStageRefreshRun(ctx.runId, ctx.emit, ctx.deps),
    "solve.dof": () => Promise.resolve(pipelineStageSolveDofRun(ctx.runId, ctx.emit, ctx.deps)),
    "stage.events": () => Promise.resolve(pipelineStageEventsEmit(ctx.runId, ctx.emit, ctx.deps)),
    artifact: () => Promise.resolve(pipelineArtifactEventEmit(ctx.runId, ctx.emit, ctx.deps)),
  } as const satisfies Record<PipelineStageId, () => Promise<void>>;
}

async function pipelineStagesEventExecute(
  stageIds: PipelineStageId[],
  ctx: PipelineStageContext,
) {
  const handlers = pipelineStageHandlersBuild(ctx);
  await pipelineStageIdsExecuteSequential(stageIds, async (stageId) => {
    await handlers[stageId]();
  });
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
  pipelineStageStartedEmit(emit, runId, "ingest");
}

function pipelineStageIngestSkippedEmit(emit: PipelineEmit, runId: string) {
  pipelineStageCompletedEmit(emit, runId, "ingest", { skipped: true });
}

function pipelineStageIngestCompletedEmit(emit: PipelineEmit, runId: string) {
  pipelineStageCompletedEmit(emit, runId, "ingest");
}

function pipelineIngestDepsBuild() {
  return {
    handleFile: (file: File) => (window as any).FFTAudio?.handleFile?.(file),
    getCurrentWave: () => (window as any).FFTState?.currentWave || null,
  };
}

async function pipelineStageRefreshRun(runId: string, emit: PipelineEmit, deps: PipelineRunnerDeps) {
  pipelineStageStartedEmit(emit, runId, "refresh");
  await deps.refreshAll();
  pipelineStageCompletedEmit(emit, runId, "refresh");
}

function pipelineStageSolveDofRun(runId: string, emit: PipelineEmit, deps: PipelineRunnerDeps) {
  pipelineStageStartedEmit(emit, runId, "solve.dof");
  stageSolveDofRun({ state: deps.state });
  pipelineStageCompletedEmit(emit, runId, "solve.dof");
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
  (["preprocess", "segment", "tap.analyze"] as const).forEach((stageId) => {
    pipelineStageCompletedEmit(emit, runId, stageId, { summary });
  });
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

function pipelineTotalTimingLog(pipelineStartMs: number) {
  console.info("[Resonance Reader] pipeline.total ms", Date.now() - pipelineStartMs);
}

async function pipelineRunnerExecute(
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  const pipelineStartMs = Date.now();
  const emitWithTiming = pipelineStageTimingEmitWithCaptureBuild(
    emit,
    Date.now,
    (stageId, durationMs) => console.info("[Resonance Reader] stage.completed ms", stageId, durationMs),
  );
  const stageIds = pipelineStageIdsResolveFromConfig(config, pipelineDefaultStageIdsBuild());
  pipelineBoundariesSeedIntoState(deps.state, deps);
  try {
    await pipelineRunWithLifecycle({
      runIdPrefix: "resonate",
      input,
      config,
      emit: emitWithTiming,
      run: async (runId) => {
        await pipelineStagesEventExecute(
          stageIds,
          pipelineStageContextBuild(input, runId, emitWithTiming, deps),
        );
      },
    });
  } finally {
    pipelineTotalTimingLog(pipelineStartMs);
  }
}

function pipelineStageContextBuild(
  input: Record<string, unknown>,
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) : PipelineStageContext {
  return { input, runId, emit, deps };
}

function pipelineStageWaveformRun(
  runId: string,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  waveformStageRun(runId, pipelineEmitAdapterBuild(emit), deps);
}

export function pipelineRunnerRun(
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  emit: PipelineEmit,
  deps: PipelineRunnerDeps,
) {
  return pipelineRunnerExecute(input, config, emit, deps);
}

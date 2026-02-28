import { noteSegmentationBuildFromWave } from "./resonate_note_segmentation.js";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js";
import { waveformStageRun } from "./resonate_stage_waveform.js";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js";
import { pipelineEventEmit as pipelineRunnerEventEmit, pipelineStageIdsResolveFromConfig, } from "../common/pipeline_runtime.js";
import { pipelineStageTimingEmitWithCaptureBuild } from "../common/pipeline_stage_timing.js";
import { pipelineStageIdsExecuteSequential } from "../common/pipeline_stage_executor.js";
import { pipelineRunWithLifecycle } from "../common/pipeline_lifecycle.js";
import { pipelineEmitAdapterBuild } from "../common/pipeline_emit_adapter.js";
import { pipelineStageCompletedEmit, pipelineStageStartedEmit, } from "../common/pipeline_stage_events.js";
function pipelineBoundariesSeedIntoState(state, deps) {
    resonanceBoundarySeedIntoState(state, {
        analysis: deps.analysisBoundary,
        signal: deps.signalBoundary,
        overlay: deps.overlayBoundary,
    });
}
async function pipelineStageNoteSegmentationRun(runId, emit, deps) {
    pipelineStageStartedEmit(emit, runId, "segment.notes");
    const { wave, sampleRate } = pipelineNoteSegmentationInputBuild(deps);
    if (!wave || !Number.isFinite(sampleRate)) {
        pipelineNoteSegmentationResetState(deps.state);
        pipelineStageSegmentNotesSkippedEmit(emit, runId);
        return;
    }
    const notes = await noteSegmentationBuildFromWave(wave, sampleRate);
    pipelineNoteSegmentationApplyToState(notes, deps.state);
    pipelineNotesReadyEmit(emit, runId, notes);
    pipelineStageSegmentNotesCompletedEmit(emit, runId, notes.slices.length);
}
function pipelineNoteSegmentationInputBuild(deps) {
    const src = deps.state?.currentWave;
    const wave = src?.wave || src?.samples || null;
    const sampleRate = src?.sampleRate;
    return { wave, sampleRate };
}
function pipelineNoteSegmentationResetState(state) {
    state.noteSlices = [];
    state.noteResults = [];
}
function pipelineNoteSegmentationApplyToState(notes, state) {
    state.noteSlices = notes.slices;
    state.noteResults = notes.results;
}
function pipelineNotesReadyEmit(emit, runId, notes) {
    pipelineRunnerEventEmit(emit, "notes.ready", runId, { notes }, "segment.notes");
}
function pipelineStageSegmentNotesCompletedEmit(emit, runId, noteCount) {
    pipelineStageCompletedEmit(emit, runId, "segment.notes", { noteCount });
}
function pipelineStageSegmentNotesSkippedEmit(emit, runId) {
    pipelineStageCompletedEmit(emit, runId, "segment.notes", { skipped: true });
}
function pipelineDefaultStageIdsBuild() {
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
function pipelineStageHandlersBuild(ctx) {
    return {
        ingest: () => pipelineStageIngestRun(ctx.input, ctx.runId, ctx.emit, ctx.deps),
        waveform: () => Promise.resolve(pipelineStageWaveformRun(ctx.runId, ctx.emit, ctx.deps)),
        "segment.notes": () => pipelineStageNoteSegmentationRun(ctx.runId, ctx.emit, ctx.deps),
        refresh: () => pipelineStageRefreshRun(ctx.runId, ctx.emit, ctx.deps),
        "solve.dof": () => Promise.resolve(pipelineStageSolveDofRun(ctx.runId, ctx.emit, ctx.deps)),
        "stage.events": () => Promise.resolve(pipelineStageEventsEmit(ctx.runId, ctx.emit, ctx.deps)),
        artifact: () => Promise.resolve(pipelineArtifactEventEmit(ctx.runId, ctx.emit, ctx.deps)),
    };
}
async function pipelineStagesEventExecute(stageIds, ctx) {
    const handlers = pipelineStageHandlersBuild(ctx);
    await pipelineStageIdsExecuteSequential(stageIds, async (stageId) => {
        await handlers[stageId]();
    });
}
async function pipelineStageIngestRun(input, runId, emit, deps) {
    pipelineStageIngestStartedEmit(emit, runId);
    const ingestApi = window.ResonateIngestStage;
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
function pipelineStageIngestStartedEmit(emit, runId) {
    pipelineStageStartedEmit(emit, runId, "ingest");
}
function pipelineStageIngestSkippedEmit(emit, runId) {
    pipelineStageCompletedEmit(emit, runId, "ingest", { skipped: true });
}
function pipelineStageIngestCompletedEmit(emit, runId) {
    pipelineStageCompletedEmit(emit, runId, "ingest");
}
function pipelineIngestDepsBuild() {
    return {
        handleFile: (file) => window.FFTAudio?.handleFile?.(file),
        getCurrentWave: () => window.FFTState?.currentWave || null,
    };
}
async function pipelineStageRefreshRun(runId, emit, deps) {
    pipelineStageStartedEmit(emit, runId, "refresh");
    await deps.refreshAll();
    pipelineStageCompletedEmit(emit, runId, "refresh");
}
function pipelineStageSolveDofRun(runId, emit, deps) {
    pipelineStageStartedEmit(emit, runId, "solve.dof");
    stageSolveDofRun({ state: deps.state });
    pipelineStageCompletedEmit(emit, runId, "solve.dof");
}
function pipelineStageEventsEmit(runId, emit, deps) {
    const stageApi = window.ResonateStageEvents;
    if (!stageApi?.RESONATE_STAGE_EVENT_FLAG?.defaultValue)
        return;
    const summary = stageApi.stageEventSummaryBuildFromState(deps.state);
    pipelineStageSummaryEventsEmit(runId, emit, summary);
}
function pipelineStageSummaryEventsEmit(runId, emit, summary) {
    ["preprocess", "segment", "tap.analyze"].forEach((stageId) => {
        pipelineStageCompletedEmit(emit, runId, stageId, { summary });
    });
}
function pipelineArtifactEventEmit(runId, emit, deps) {
    const artifactApi = window.ResonateArtifactEvent;
    if (!artifactApi?.RESONATE_ARTIFACT_EVENT_FLAG?.defaultValue)
        return;
    const summary = artifactApi.artifactSummaryBuildFromState(deps.state);
    const payload = pipelineArtifactPayloadBuildFromState(summary, deps.state);
    pipelineRunnerEventEmit(emit, "artifact.emitted", runId, payload, "artifact");
}
function pipelineArtifactPayloadBuildFromState(summary, state) {
    const renderApi = window.ResonateRenderEvents;
    const renderPayload = renderApi?.RESONATE_RENDER_EVENT_FLAG?.defaultValue && renderApi?.renderPayloadBuildFromState
        ? renderApi.renderPayloadBuildFromState(state)
        : null;
    const payload = { summary };
    if (renderPayload)
        payload.renderPayload = renderPayload;
    return payload;
}
function pipelineTotalTimingLog(pipelineStartMs) {
    console.info("[Resonance Reader] pipeline.total ms", Date.now() - pipelineStartMs);
}
async function pipelineRunnerExecute(input, config, emit, deps) {
    const pipelineStartMs = Date.now();
    const emitWithTiming = pipelineStageTimingEmitWithCaptureBuild(emit, Date.now, (stageId, durationMs) => console.info("[Resonance Reader] stage.completed ms", stageId, durationMs));
    const stageIds = pipelineStageIdsResolveFromConfig(config, pipelineDefaultStageIdsBuild());
    pipelineBoundariesSeedIntoState(deps.state, deps);
    try {
        await pipelineRunWithLifecycle({
            runIdPrefix: "resonate",
            input,
            config,
            emit: emitWithTiming,
            run: async (runId) => {
                await pipelineStagesEventExecute(stageIds, pipelineStageContextBuild(input, runId, emitWithTiming, deps));
            },
        });
    }
    finally {
        pipelineTotalTimingLog(pipelineStartMs);
    }
}
function pipelineStageContextBuild(input, runId, emit, deps) {
    return { input, runId, emit, deps };
}
function pipelineStageWaveformRun(runId, emit, deps) {
    waveformStageRun(runId, pipelineEmitAdapterBuild(emit), deps);
}
export function pipelineRunnerRun(input, config, emit, deps) {
    return pipelineRunnerExecute(input, config, emit, deps);
}

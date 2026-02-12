import { noteSegmentationBuildFromWave } from "./resonate_note_segmentation.js";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js";
import { waveformStageRun } from "./resonate_stage_waveform.js";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js";
import { createPipelineBus } from "./resonate_pipeline_bus.js";
function pipelineBoundariesSeedIntoState(state, deps) {
    resonanceBoundarySeedIntoState(state, {
        analysis: deps.analysisBoundary,
        signal: deps.signalBoundary,
        overlay: deps.overlayBoundary,
    });
}
async function pipelineStageNoteSegmentationRun(runId, emit, deps) {
    pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "segment.notes" }, "segment.notes");
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
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "segment.notes", noteCount }, "segment.notes");
}
function pipelineStageSegmentNotesSkippedEmit(emit, runId) {
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "segment.notes", skipped: true }, "segment.notes");
}
function buildPipelineEvent(eventType, runId, payload, stageId) {
    return {
        eventId: pipelineEventIdBuild(runId),
        eventType,
        timestampIso: pipelineTimestampIsoBuild(),
        runId,
        stageId,
        payload,
    };
}
function pipelineEventIdBuild(runId) {
    return `${runId}_${Math.random().toString(36).slice(2, 8)}`;
}
function pipelineTimestampIsoBuild() {
    return new Date().toISOString();
}
function pipelineRunnerEventEmit(emit, eventType, runId, payload, stageId) {
    emit(buildPipelineEvent(eventType, runId, payload, stageId));
}
function pipelineEmitWithStageTimingBuild(emit) {
    const stageStartMsById = new Map();
    return (event) => {
        pipelineStageTimingCaptureFromEvent(stageStartMsById, event);
        emit(event);
    };
}
function pipelineStageTimingCaptureFromEvent(stageStartMsById, event) {
    const stageId = pipelineStageTimingKeySelectFromEvent(event);
    if (!stageId)
        return;
    if (event.eventType === "stage.started") {
        stageStartMsById.set(stageId, Date.now());
        return;
    }
    if (event.eventType === "stage.completed") {
        const startMs = stageStartMsById.get(stageId);
        if (!Number.isFinite(startMs))
            return;
        console.info("[Resonance Reader] stage.completed ms", stageId, Date.now() - startMs);
    }
}
function pipelineStageTimingKeySelectFromEvent(event) {
    const payloadStage = event.payload?.stage;
    return event.stageId || payloadStage || null;
}
function pipelineStartEventEmit(emit, runId, input, config) {
    pipelineRunnerEventEmit(emit, "pipeline.started", runId, { input, config });
}
function pipelineRunIdBuild() {
    return `resonate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function pipelineStageIdsSelectFromConfig(config) {
    const useStageList = config?.useStageList;
    const stages = config?.stages || null;
    const defaultStages = pipelineDefaultStageIdsBuild();
    if (!useStageList || !Array.isArray(stages) || !stages.length)
        return defaultStages;
    return pipelineStageIdsFilterAllowed(stages, defaultStages);
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
function pipelineStageIdsFilterAllowed(stages, allowedStages) {
    const allowed = new Set(allowedStages);
    return stages.filter((stage) => allowed.has(stage));
}
function pipelineEmitAdapterBuild(emit) {
    return (eventType, run, payload, stageId) => {
        pipelineRunnerEventEmit(emit, eventType, run, payload, stageId);
    };
}
async function pipelineStageRunById(stageId, ctx) {
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
async function pipelineStagesEventExecute(stageIds, ctx) {
    const stageBus = createPipelineBus();
    stageBus.wire("stage.execute", pipelineStageExecuteHandleBuild(ctx));
    for (const stageId of stageIds) {
        await stageBus.emit("stage.execute", { stageId });
    }
}
function pipelineStageExecuteHandleBuild(ctx) {
    return async (payload) => {
        const stageId = payload?.stageId;
        if (!stageId)
            return;
        await pipelineStageRunById(stageId, ctx);
    };
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
    pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "ingest" }, "ingest");
}
function pipelineStageIngestSkippedEmit(emit, runId) {
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "ingest", skipped: true }, "ingest");
}
function pipelineStageIngestCompletedEmit(emit, runId) {
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "ingest" }, "ingest");
}
function pipelineIngestDepsBuild() {
    return {
        handleFile: (file) => window.FFTAudio?.handleFile?.(file),
        getCurrentWave: () => window.FFTState?.currentWave || null,
    };
}
async function pipelineStageRefreshRun(runId, emit, deps) {
    pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "refresh" }, "refresh");
    await deps.refreshAll();
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "refresh" }, "refresh");
}
function pipelineStageSolveDofRun(runId, emit, deps) {
    pipelineRunnerEventEmit(emit, "stage.started", runId, { stage: "solve.dof" }, "solve.dof");
    stageSolveDofRun({ state: deps.state });
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "solve.dof" }, "solve.dof");
}
function pipelineStageEventsEmit(runId, emit, deps) {
    const stageApi = window.ResonateStageEvents;
    if (!stageApi?.RESONATE_STAGE_EVENT_FLAG?.defaultValue)
        return;
    const summary = stageApi.stageEventSummaryBuildFromState(deps.state);
    pipelineStageSummaryEventsEmit(runId, emit, summary);
}
function pipelineStageSummaryEventsEmit(runId, emit, summary) {
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "preprocess", summary }, "preprocess");
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "segment", summary }, "segment");
    pipelineRunnerEventEmit(emit, "stage.completed", runId, { stage: "tap.analyze", summary }, "tap.analyze");
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
function pipelineCompletedEventEmit(emit, runId, trigger) {
    pipelineRunnerEventEmit(emit, "pipeline.completed", runId, { summary: { trigger } });
}
function pipelineFailedEventEmit(emit, runId, err) {
    pipelineRunnerEventEmit(emit, "pipeline.failed", runId, { error: String(err) });
}
function pipelineTotalTimingLog(pipelineStartMs) {
    console.info("[Resonance Reader] pipeline.total ms", Date.now() - pipelineStartMs);
}
async function pipelineRunnerExecute(input, config, emit, deps) {
    const runId = pipelineRunIdBuild();
    const pipelineStartMs = Date.now();
    const emitWithTiming = pipelineEmitWithStageTimingBuild(emit);
    const stageIds = pipelineStageIdsSelectFromConfig(config);
    pipelineBoundariesSeedIntoState(deps.state, deps);
    pipelineStartEventEmit(emitWithTiming, runId, input, config);
    try {
        await pipelineStagesEventExecute(stageIds, pipelineStageContextBuild(input, runId, emitWithTiming, deps));
        pipelineTotalTimingLog(pipelineStartMs);
        pipelineCompletedEventEmit(emitWithTiming, runId, input?.trigger || null);
    }
    catch (err) {
        pipelineTotalTimingLog(pipelineStartMs);
        pipelineFailedEventEmit(emitWithTiming, runId, err);
        throw err;
    }
}
function pipelineStageContextBuild(input, runId, emit, deps) {
    return { input, runId, emit, deps };
}
async function pipelineStageNoteSegmentationRunWithTiming(runId, emit, deps) {
    const noteSegStartMs = Date.now();
    await pipelineStageNoteSegmentationRun(runId, emit, deps);
    void noteSegStartMs;
}
async function pipelineStageRefreshRunWithTiming(runId, emit, deps) {
    const refreshStartMs = Date.now();
    await pipelineStageRefreshRun(runId, emit, deps);
    void refreshStartMs;
}
function pipelineStageSolveDofRunWithTiming(runId, emit, deps) {
    const solveStartMs = Date.now();
    pipelineStageSolveDofRun(runId, emit, deps);
    void solveStartMs;
}
function pipelineStageEventsEmitWithTiming(runId, emit, deps) {
    const stageEventsStartMs = Date.now();
    pipelineStageEventsEmit(runId, emit, deps);
    void stageEventsStartMs;
}
function pipelineArtifactEventEmitWithTiming(runId, emit, deps) {
    const artifactStartMs = Date.now();
    pipelineArtifactEventEmit(runId, emit, deps);
    void artifactStartMs;
}
function pipelineStageWaveformRunWithTiming(runId, emit, deps) {
    const waveformStartMs = Date.now();
    waveformStageRun(runId, pipelineEmitAdapterBuild(emit), deps);
    void waveformStartMs;
}
async function pipelineStageIngestRunWithTiming(input, runId, emit, deps) {
    const ingestStartMs = Date.now();
    await pipelineStageIngestRun(input, runId, emit, deps);
    void ingestStartMs;
}
export function pipelineRunnerRun(input, config, emit, deps) {
    return pipelineRunnerExecute(input, config, emit, deps);
}

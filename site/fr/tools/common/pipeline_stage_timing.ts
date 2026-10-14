export type PipelineStageTimingEvent = {
  eventType: string;
  stageId?: string;
  payload: Record<string, unknown>;
};

export type PipelineStageTimingLog = (stageId: string, durationMs: number) => void;
export type PipelineStageTimingNow = () => number;

type PipelineStageStartTimes = Map<string, number>;

export function pipelineStageTimingEmitWithCaptureBuild(
  emit: (event: PipelineStageTimingEvent) => void,
  now: PipelineStageTimingNow = Date.now,
  log: PipelineStageTimingLog = () => undefined,
) {
  const stageStartMsById = new Map<string, number>();
  return (event: PipelineStageTimingEvent) => {
    pipelineStageTimingCapture(stageStartMsById, event, now, log);
    emit(event);
  };
}

function pipelineStageTimingCapture(
  stageStartMsById: PipelineStageStartTimes,
  event: PipelineStageTimingEvent,
  now: PipelineStageTimingNow,
  log: PipelineStageTimingLog,
) {
  const stageId = pipelineStageTimingStageIdResolve(event);
  if (!stageId) return;
  if (event.eventType === "stage.started") {
    stageStartMsById.set(stageId, now());
    return;
  }
  if (event.eventType !== "stage.completed") return;
  const startMs = stageStartMsById.get(stageId);
  if (typeof startMs !== "number" || !Number.isFinite(startMs)) return;
  log(stageId, now() - startMs);
}

function pipelineStageTimingStageIdResolve(event: PipelineStageTimingEvent): string | null {
  const payloadStage = (event.payload as { stage?: string } | null)?.stage;
  return event.stageId || payloadStage || null;
}

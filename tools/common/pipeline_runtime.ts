export type PipelineRuntimeEvent = {
  eventId: string;
  eventType: string;
  timestampIso: string;
  runId: string;
  stageId?: string;
  payload: Record<string, unknown>;
};

export type PipelineRuntimeEmit = (event: PipelineRuntimeEvent) => void;

type PipelineStageListConfig = {
  useStageList?: boolean;
  stages?: string[];
};

export function pipelineRunIdBuild(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}_${entropy}`;
}

export function pipelineEventBuild(
  eventType: string,
  runId: string,
  payload: Record<string, unknown>,
  stageId?: string,
): PipelineRuntimeEvent {
  return {
    eventId: pipelineEventIdBuild(runId),
    eventType,
    timestampIso: new Date().toISOString(),
    runId,
    stageId,
    payload,
  };
}

function pipelineEventIdBuild(runId: string): string {
  return `${runId}_${Math.random().toString(36).slice(2, 8)}`;
}

export function pipelineEventEmit(
  emit: PipelineRuntimeEmit,
  eventType: string,
  runId: string,
  payload: Record<string, unknown>,
  stageId?: string,
): void {
  emit(pipelineEventBuild(eventType, runId, payload, stageId));
}

export function pipelineStageIdsResolveFromConfig<TStageId extends string>(
  config: Record<string, unknown>,
  defaultStageIds: TStageId[],
): TStageId[] {
  const parsed = config as PipelineStageListConfig;
  if (!parsed.useStageList || !Array.isArray(parsed.stages) || !parsed.stages.length) {
    return defaultStageIds;
  }
  const allowed = new Set<TStageId>(defaultStageIds);
  return parsed.stages.filter((stage): stage is TStageId => allowed.has(stage as TStageId));
}

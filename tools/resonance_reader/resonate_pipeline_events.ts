export type PipelineEventName = string;

export type PipelineEventMeta = {
  runId?: string;
  stageId?: string;
};

export type PipelinePayloads = ResonatePipelineEventPayloads;

export type ResonatePipelineEventPayloads = {
  "pipeline.started": PipelineEventMeta & { input: Record<string, unknown>; config: Record<string, unknown> };
  "pipeline.completed": PipelineEventMeta & { summary: { trigger: unknown } };
  "pipeline.failed": PipelineEventMeta & { error: string };
  "pipeline.event": PipelineEventMeta & {
    eventType: string;
    payload?: Record<string, unknown>;
  };
  "stage.started": PipelineEventMeta & { stage: string };
  "stage.completed": PipelineEventMeta & {
    stage: string;
    skipped?: boolean;
    tapCount?: number;
    noteCount?: number;
    summary?: unknown;
  };
  "waveform.ready": PipelineEventMeta & { wave: unknown };
  "notes.ready": PipelineEventMeta & { notes: unknown };
  "artifact.emitted": PipelineEventMeta & { summary?: unknown; renderPayload?: unknown };
  "spectrum.ready": PipelineEventMeta & { spectrum: { freqs: number[]; mags: number[]; dbs: number[] } };
  "modes.ready": PipelineEventMeta & { modes: unknown[]; cards: unknown[] };
  "mode.override.requested": PipelineEventMeta & {
    modeKey: string;
    requestedFreqHz: number;
    source: "label-drag";
  };
  "mode.override.reset.requested": PipelineEventMeta & {
    modeKey: string;
    source: "card-reset";
  };
  "mode.override.updated": PipelineEventMeta & {
    modeKey: string;
    freqHz: number | null;
    reason: "set" | "reset";
    source: "label-drag" | "card-reset";
  };
};

export type PipelineHandler<TPayload = unknown> = (
  payload: TPayload,
  ctx: PipelineContext,
) => void | Promise<void>;

export type PipelineContext = {
  emit: (event: PipelineEventName, payload: unknown) => void;
  log: (message: string) => void;
};

type PipelineEvent = {
  eventId: string;
  eventType: string;
  timestampIso: string;
  runId: string;
  stageId?: string;
  payload: Record<string, unknown>;
};

type PipelineEventEmitOptions = {
  runIdPrefix?: string;
  stageId?: string;
};

function pipelineEventEmitToBus(
  eventType: string,
  payload: Record<string, unknown>,
  opts: PipelineEventEmitOptions,
): boolean {
  const bus = (window as any).ResonatePipelineBus;
  if (typeof bus?.emit !== "function") return false;
  void bus.emit(eventType, { ...payload, stageId: opts.stageId });
  return true;
}

export function pipelineEventEmit(
  eventType: string,
  payload: Record<string, unknown>,
  opts: PipelineEventEmitOptions = {},
): boolean {
  return pipelineEventEmitToBus(eventType, payload, opts);
}

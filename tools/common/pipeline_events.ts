export type PipelineEventName = string;

export type PipelineContext = {
  emit: (event: PipelineEventName, payload: unknown) => void;
  log: (message: string) => void;
};

export type PipelineHandler<TPayload = unknown> = (
  payload: TPayload,
  ctx: PipelineContext,
) => void | Promise<void>;

import type { PipelineContext, PipelineEventName, PipelineHandler } from "./resonate_pipeline_events.js";

type PipelineBus = {
  wire: (event: PipelineEventName, handler: PipelineHandler) => void;
  emit: (event: PipelineEventName, payload: unknown) => Promise<void>;
  context: PipelineContext;
};

export function createPipelineBus(): PipelineBus {
  const handlers = new Map<PipelineEventName, PipelineHandler[]>();

  const context: PipelineContext = {
    emit: (event, payload) => {
      void emit(event, payload);
    },
    log: (message: string) => {
      console.info("[Resonate Pipeline]", message);
    },
  };

  function wire(event: PipelineEventName, handler: PipelineHandler) {
    const list = handlers.get(event) || [];
    list.push(handler);
    handlers.set(event, list);
  }

  async function emit(event: PipelineEventName, payload: unknown) {
    const list = handlers.get(event);
    if (!list || !list.length) return;
    for (const handler of list) {
      await handler(payload, context);
    }
  }

  return { wire, emit, context };
}

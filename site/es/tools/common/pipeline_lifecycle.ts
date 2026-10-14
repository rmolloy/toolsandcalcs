import {
  pipelineEventEmit,
  pipelineRunIdBuild,
  type PipelineRuntimeEmit,
} from "./pipeline_runtime.js";

type PipelineLifecycleOptions = {
  runIdPrefix: string;
  input: Record<string, unknown>;
  config: Record<string, unknown>;
  emit: PipelineRuntimeEmit;
  run: (runId: string) => Promise<void>;
};

export async function pipelineRunWithLifecycle({
  runIdPrefix,
  input,
  config,
  emit,
  run,
}: PipelineLifecycleOptions): Promise<void> {
  const runId = pipelineRunIdBuild(runIdPrefix);
  pipelineEventEmit(emit, "pipeline.started", runId, { input, config });
  try {
    await run(runId);
    pipelineEventEmit(emit, "pipeline.completed", runId, { summary: { trigger: input?.trigger || null } });
  } catch (error) {
    pipelineEventEmit(emit, "pipeline.failed", runId, { error: String(error) });
    throw error;
  }
}

import { pipelineEventEmit, pipelineRunIdBuild, } from "./pipeline_runtime.js";
export async function pipelineRunWithLifecycle({ runIdPrefix, input, config, emit, run, }) {
    const runId = pipelineRunIdBuild(runIdPrefix);
    pipelineEventEmit(emit, "pipeline.started", runId, { input, config });
    try {
        await run(runId);
        pipelineEventEmit(emit, "pipeline.completed", runId, { summary: { trigger: input?.trigger || null } });
    }
    catch (error) {
        pipelineEventEmit(emit, "pipeline.failed", runId, { error: String(error) });
        throw error;
    }
}

import { pipelineEventEmit, pipelineRunIdBuild, } from "./pipeline_runtime.js?rev=957cdb0b4694";
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

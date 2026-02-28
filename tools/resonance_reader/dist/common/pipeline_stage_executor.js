export async function pipelineStageIdsExecuteSequential(stageIds, execute) {
    for (const stageId of stageIds) {
        await execute(stageId);
    }
}

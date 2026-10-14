export async function pipelineStageIdsExecuteSequential<TStageId extends string>(
  stageIds: TStageId[],
  execute: (stageId: TStageId) => Promise<void>,
): Promise<void> {
  for (const stageId of stageIds) {
    await execute(stageId);
  }
}

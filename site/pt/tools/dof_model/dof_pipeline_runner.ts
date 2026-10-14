import {
  pipelineStageIdsResolveFromConfig,
  type PipelineRuntimeEmit,
} from "../common/pipeline_runtime.js";
import { pipelineStageIdsExecuteSequential } from "../common/pipeline_stage_executor.js";
import { pipelineRunWithLifecycle } from "../common/pipeline_lifecycle.js";
import {
  pipelineStageCompletedEmit,
  pipelineStageStartedEmit,
} from "../common/pipeline_stage_events.js";

type DofPipelineStageId = "refresh";

type DofPipelineDeps = {
  refresh: () => Promise<void> | void;
};

export async function dofPipelineRunnerRun(
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  emit: PipelineRuntimeEmit,
  deps: DofPipelineDeps,
): Promise<void> {
  await pipelineRunWithLifecycle({
      runIdPrefix: "dof",
      input,
      config,
      emit,
      run: async (runId) => {
      const handlers = dofPipelineStageHandlersBuild(runId, emit, deps);
        const stageIds = pipelineStageIdsResolveFromConfig(config, dofPipelineStageIdsDefaultBuild());
        await pipelineStageIdsExecuteSequential(stageIds, async (stageId) => {
          await dofPipelineStageRunById(stageId, handlers);
        });
      },
    });
}

function dofPipelineStageIdsDefaultBuild(): DofPipelineStageId[] {
  return ["refresh"];
}

async function dofPipelineStageRunById(
  stageId: DofPipelineStageId,
  handlers: Record<DofPipelineStageId, () => Promise<void>>,
): Promise<void> {
  await handlers[stageId]();
}

function dofPipelineStageHandlersBuild(
  runId: string,
  emit: PipelineRuntimeEmit,
  deps: DofPipelineDeps,
) {
  return {
    refresh: () => dofPipelineStageRefreshRun(runId, emit, deps),
  } as const satisfies Record<DofPipelineStageId, () => Promise<void>>;
}

async function dofPipelineStageRefreshRun(
  runId: string,
  emit: PipelineRuntimeEmit,
  deps: DofPipelineDeps,
): Promise<void> {
  pipelineStageStartedEmit(emit, runId, "refresh");
  await deps.refresh();
  pipelineStageCompletedEmit(emit, runId, "refresh");
}

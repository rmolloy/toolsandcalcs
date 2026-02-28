import { pipelineRunnerRun } from "./resonate_pipeline_runner.js";
import { uiBindingsAttach } from "./resonate_ui_bindings.js";
import { wireResonatePipeline } from "./resonate_pipeline_wiring.js";
import { pipelineRuntimeEventForwardToBus } from "../common/pipeline_event_forwarder.js";
import { createPipelineBus } from "../common/pipeline_bus.js";
import type { PipelineRuntimeEvent } from "../common/pipeline_runtime.js";

type ResonatePipelineBootstrapDeps = {
  state: Record<string, any> & import("./resonate_boundary_state.js").ResonanceBoundaryState;
  refreshPipeline: () => Promise<void>;
  runPipelineRunner: (trigger: string) => Promise<void>;
  renderMock: () => void;
  setStatus: (text: string) => void;
  renderSpectrum: (payload: { freqs: number[]; mags: number[]; overlay?: number[]; modes?: any[] }) => void;
  renderModes: (modes: any[]) => void;
  renderWaveform: (wave: any) => void;
  analysisBoundary?: import("./resonate_analysis_boundary.js").AnalysisBoundary;
  signalBoundary?: import("./resonate_signal_boundary.js").SignalBoundary;
  overlayBoundary?: import("./resonate_overlay_boundary.js").OverlayBoundary;
};

function pipelineRunnerWindowExpose(
  bus: ReturnType<typeof createPipelineBus>,
  deps: ResonatePipelineBootstrapDeps,
) {
  (window as any).ResonatePipelineRunner = {
    run: (input: Record<string, unknown>, config: Record<string, unknown>) =>
      pipelineRunnerRun(
        input,
        config,
        (event: PipelineRuntimeEvent) => pipelineRuntimeEventForwardToBus(bus, event),
        {
          state: deps.state,
          refreshAll: deps.refreshPipeline,
          analysisBoundary: deps.analysisBoundary,
          signalBoundary: deps.signalBoundary,
          overlayBoundary: deps.overlayBoundary,
        },
      ),
  };
}

export function resonatePipelineBootstrapAttach(deps: ResonatePipelineBootstrapDeps) {
  const bus = createPipelineBus({ logPrefix: "[Resonate Pipeline]" });
  (window as any).ResonatePipelineBus = bus;
  wireResonatePipeline(bus);
  pipelineRunnerWindowExpose(bus, deps);
  uiBindingsAttach({
    state: deps.state,
    runResonatePipeline: deps.runPipelineRunner,
    renderMock: deps.renderMock,
    setStatus: deps.setStatus,
    renderSpectrum: deps.renderSpectrum,
    renderModes: deps.renderModes,
    renderWaveform: deps.renderWaveform,
    pipelineBus: bus,
  });
}

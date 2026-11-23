import { pipelineRunnerRun } from "./resonate_pipeline_runner.js?rev=dae658f6289e";
import { uiBindingsAttach } from "./resonate_ui_bindings.js?rev=dae658f6289e";
import { wireResonatePipeline } from "./resonate_pipeline_wiring.js?rev=dae658f6289e";
import { pipelineRuntimeEventForwardToBus } from "../common/pipeline_event_forwarder.js?rev=dae658f6289e";
import { createPipelineBus } from "../common/pipeline_bus.js?rev=dae658f6289e";
function pipelineRunnerWindowExpose(bus, deps) {
    window.ResonatePipelineRunner = {
        run: (input, config) => pipelineRunnerRun(input, config, (event) => pipelineRuntimeEventForwardToBus(bus, event), {
            state: deps.state,
            refreshAll: deps.refreshPipeline,
            analysisBoundary: deps.analysisBoundary,
            signalBoundary: deps.signalBoundary,
            overlayBoundary: deps.overlayBoundary,
        }),
    };
}
export function resonatePipelineBootstrapAttach(deps) {
    const bus = createPipelineBus({ logPrefix: "[Resonate Pipeline]" });
    window.ResonatePipelineBus = bus;
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
        perTabSession: deps.perTabSession,
        pipelineBus: bus,
    });
}

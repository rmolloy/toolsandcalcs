import { pipelineRunnerRun } from "./resonate_pipeline_runner.js";
import { uiBindingsAttach } from "./resonate_ui_bindings.js";
import { createPipelineBus } from "./resonate_pipeline_bus.js";
import { wireResonatePipeline } from "./resonate_pipeline_wiring.js";
function pipelineRunnerEventEmitToBus(bus, event) {
    void bus.emit("pipeline.event", {
        eventType: event.eventType,
        runId: event.runId,
        stageId: event.stageId,
        payload: event.payload,
    });
    void bus.emit(event.eventType, {
        ...event.payload,
        runId: event.runId,
        stageId: event.stageId,
    });
}
function pipelineRunnerWindowExpose(bus, deps) {
    window.ResonatePipelineRunner = {
        run: (input, config) => pipelineRunnerRun(input, config, (event) => pipelineRunnerEventEmitToBus(bus, event), {
            state: deps.state,
            refreshAll: deps.refreshPipeline,
            analysisBoundary: deps.analysisBoundary,
            signalBoundary: deps.signalBoundary,
            overlayBoundary: deps.overlayBoundary,
        }),
    };
}
export function resonatePipelineBootstrapAttach(deps) {
    const bus = createPipelineBus();
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
        pipelineBus: bus,
    });
}

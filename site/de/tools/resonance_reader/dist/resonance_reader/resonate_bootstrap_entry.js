import { renderMock } from "./resonate_mock_render.js?rev=b5b8fa4adb00";
import { resonatePipelineBootstrapAttach } from "./resonate_pipeline_bootstrap.js?rev=b5b8fa4adb00";
export function resonanceReaderBootstrap(deps) {
    const renderMockBound = () => renderMock({ renderSpectrum: deps.renderSpectrum, renderModes: deps.renderModes });
    resonatePipelineBootstrapAttach({
        state: deps.state,
        refreshPipeline: deps.refreshPipeline,
        runPipelineRunner: deps.runPipelineRunner,
        renderMock: renderMockBound,
        setStatus: deps.setStatus,
        renderSpectrum: deps.renderSpectrum,
        renderModes: deps.renderModes,
        renderWaveform: deps.renderWaveform,
        analysisBoundary: deps.analysisBoundary,
        signalBoundary: deps.signalBoundary,
        overlayBoundary: deps.overlayBoundary,
    });
}

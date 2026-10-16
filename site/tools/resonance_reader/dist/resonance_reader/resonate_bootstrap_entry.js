import { renderMock } from "./resonate_mock_render.js?rev=3f87131f64e6";
import { resonatePipelineBootstrapAttach } from "./resonate_pipeline_bootstrap.js?rev=3f87131f64e6";
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

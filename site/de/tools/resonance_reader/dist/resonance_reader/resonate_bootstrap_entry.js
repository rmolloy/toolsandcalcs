import { renderMock } from "./resonate_mock_render.js?rev=c46dc1d6973b";
import { resonatePipelineBootstrapAttach } from "./resonate_pipeline_bootstrap.js?rev=c46dc1d6973b";
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

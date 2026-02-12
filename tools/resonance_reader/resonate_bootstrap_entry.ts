import { renderMock } from "./resonate_mock_render.js";
import { resonatePipelineBootstrapAttach } from "./resonate_pipeline_bootstrap.js";

export function resonanceReaderBootstrap(deps: {
  state: Record<string, any>;
  refreshPipeline: () => Promise<void>;
  runPipelineRunner: (trigger: string) => Promise<void>;
  setStatus: (text: string) => void;
  renderSpectrum: (payload: { freqs: number[]; mags: number[]; overlay?: number[]; modes?: any[] }) => void;
  renderModes: (modes: any[]) => void;
  renderWaveform: (wave: any) => void;
  analysisBoundary?: import("./resonate_analysis_boundary.js").AnalysisBoundary;
  signalBoundary?: import("./resonate_signal_boundary.js").SignalBoundary;
  overlayBoundary?: import("./resonate_overlay_boundary.js").OverlayBoundary;
}) {
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

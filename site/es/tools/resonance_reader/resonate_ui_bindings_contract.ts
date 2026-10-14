import type { PipelineBusLike } from "./resonate_save_button.js";
import type { takeOverlayCurrentPayloadBuild } from "./resonate_take_overlays.js";

export type ResonancePerTabSession = {
  restoreIntoState(state: Record<string, any>): Promise<boolean>;
  persistFromState(state: Record<string, any>): Promise<void>;
};

export type UiBindingsDeps = {
  state: Record<string, any>;
  runResonatePipeline: (trigger: string) => Promise<void>;
  renderMock: () => void;
  setStatus: (text: string) => void;
  renderSpectrum: (payload: {
    freqs: number[];
    mags: number[];
    overlay?: number[];
    modes?: any[];
    takeOverlays?: ReturnType<typeof takeOverlayCurrentPayloadBuild>;
  }) => void;
  renderModes: (modes: any[]) => void;
  renderWaveform: (wave: any) => void;
  pipelineBus?: PipelineBusLike;
  perTabSession?: ResonancePerTabSession | null;
};

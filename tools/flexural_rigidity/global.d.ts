import type { FlexuralRigidity as FlexCalcAPI } from "./calculator";

declare global {
  interface Window {
    FlexuralRigidity?: FlexCalcAPI;
  }
}

export {};

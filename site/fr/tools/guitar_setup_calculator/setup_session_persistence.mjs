import { createSetupSessionSnapshot, readSetupSessionSnapshot } from './setup_session_snapshot.mjs?rev=093b6a20873d';

export function createSetupSessionPersistence(runtime, capture) {
  const session = runtime.PerTabToolSession?.perTabToolSessionCreate({ toolId: 'guitar_setup_calculator', version: 1 });
  const persist = () => session?.write(createSetupSessionSnapshot(capture()));
  return {
    read: () => readSetupSessionSnapshot(session?.read()),
    attach() {
      if (!session) return;
      runtime.ToolLocaleNavigation = { prepare: persist };
      runtime.addEventListener('pagehide', persist);
      ['input', 'change', 'click', 'toggle'].forEach((type) => {
        runtime.document.addEventListener(type, () => queueMicrotask(persist), true);
      });
    },
  };
}

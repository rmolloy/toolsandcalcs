import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=7157ade1c3cc";
import { settingsModalBind } from "./resonate_settings_modal.js?rev=7157ade1c3cc";
import { readResonanceIdleStatus, saveStateMarkCleanAndRender, saveStateMarkDirtyAndRender, saveStatePipelineDirtySubscriptionAttach, } from "./resonate_save_button.js?rev=7157ade1c3cc";
import { perTabSessionLifecyclePersistenceAttach, perTabSessionPersist, perTabSessionPersistenceExpose, } from "./resonate_per_tab_persistence.js?rev=7157ade1c3cc";
import { recordingMenuInitialWidthSync } from "./resonate_recording_menu.js?rev=7157ade1c3cc";
import { bindTakeOverlayControls, takeOverlayControlsRender, } from "./resonate_take_overlay_controls.js?rev=7157ade1c3cc";
import { bindImport } from "./resonate_import_control.js?rev=7157ade1c3cc";
import { bindRecord } from "./resonate_recording_control.js?rev=7157ade1c3cc";
import { bindWaveTransport } from "./resonate_wave_transport.js?rev=7157ade1c3cc";
import { restoreNotebookConnectDraftIntoUi, restoreNotebookEventIntoUi, restorePerTabSessionIntoUi, } from "./resonate_restore_ui.js?rev=7157ade1c3cc";
import { bindSaveAudio, refreshResonanceSaveSurfaceAndRender, } from "./resonate_save_control.js?rev=7157ade1c3cc";
import { bindMeasureMode } from "./resonate_measure_mode_control.js?rev=7157ade1c3cc";
import { resonanceToolVisibilityBind } from "./resonate_tool_visibility.js?rev=7157ade1c3cc";
export { importControlUsesNativeLabel, importFileInputPrepare, } from "./resonate_import_control.js?rev=7157ade1c3cc";
export { readResonanceIdleStatus } from "./resonate_save_button.js?rev=7157ade1c3cc";
export { restoreNotebookConnectDraftIntoUi } from "./resonate_restore_ui.js?rev=7157ade1c3cc";
export { measureModeChangeApply, measureModeChangeShouldRenderMock, measureModeChangeShouldReseedDemoWave, measureModeChangeShouldRunPipelineForDemoWave, measureModeStatePreserveCustomCardsOnly, measureModeStateResetForDemoWave, measureModeViewRangesReset, peakAnalysisSourceMeasureModeSync, } from "./resonate_measure_mode_control.js?rev=7157ade1c3cc";
export function uiBindingsAttach(deps) {
    const attach = async () => {
        const restoredNotebookDraft = restoreNotebookConnectDraftIntoUi(deps);
        if (restoredNotebookDraft) {
            saveStateMarkDirtyAndRender(deps.state);
        }
        else {
            saveStateMarkCleanAndRender(deps.state);
        }
        await refreshResonanceSaveSurfaceAndRender(deps.state, deps.setStatus);
        saveStatePipelineDirtySubscriptionAttach(deps.pipelineBus, deps.state);
        deps.pipelineBus?.wire("pipeline.completed", () => perTabSessionPersist(deps));
        perTabSessionLifecyclePersistenceAttach(deps);
        perTabSessionPersistenceExpose(deps);
        recordingMenuInitialWidthSync();
        bindImport(deps);
        bindSaveAudio(deps);
        bindRecord(deps);
        bindWaveTransport(deps);
        resonanceToolVisibilityBind();
        bindTakeOverlayControls(deps);
        takeOverlayControlsRender(deps);
        settingsModalBind(deps);
        bindMeasureMode(deps);
        if (restoredNotebookDraft) {
            deps.setStatus(resonanceLocalizedMessages.restoreNotebookConnectedStatus);
            return;
        }
        if (await restoreNotebookEventIntoUi(deps)) {
            saveStateMarkCleanAndRender(deps.state);
            deps.setStatus(resonanceLocalizedMessages.restoreNotebookEventStatus);
            return;
        }
        if (await restorePerTabSessionIntoUi(deps)) {
            return;
        }
        let hasStartup = false;
        const startup = window.ResonateStartup;
        if (startup?.startupPlanBuildFromMode && startup?.startupModeSelectFromFlag && startup?.startupExecuteFromPlan) {
            const plan = startup.startupPlanBuildFromMode(startup.startupModeSelectFromFlag(startup.RESONATE_STARTUP_RUNNER_FLAG.defaultValue));
            startup.startupExecuteFromPlan(plan, {
                runRunner: () => deps.runResonatePipeline("startup"),
                renderMock: deps.renderMock,
                setStatus: deps.setStatus,
            });
            hasStartup = true;
        }
        if (!hasStartup) {
            deps.renderMock();
            deps.setStatus(readResonanceIdleStatus(deps.state));
        }
        const uiEvents = window.ResonateUiEvents;
        if (uiEvents?.RESONATE_UI_EVENT_FLAG?.defaultValue) {
            uiEvents.uiEventSubscriptionAttach(deps.state, deps.pipelineBus);
        }
    };
    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => {
            void attach();
        });
    }
    else {
        void attach();
    }
}

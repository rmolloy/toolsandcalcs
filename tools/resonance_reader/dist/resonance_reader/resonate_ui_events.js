export const RESONATE_UI_EVENT_FLAG = {
    name: "resonate_ui_event_subscribe",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove ui event flag once subscription is default",
};
export function pipelineBusEventSubscriptionAttach(bus, state) {
    if (!bus?.wire)
        return null;
    bus.wire("pipeline.event", (event) => {
        state.lastFacadeEvent = event;
    });
    return () => { };
}
export function uiEventSubscriptionAttach(state, bus) {
    if (bus?.wire) {
        return pipelineBusEventSubscriptionAttach(bus, state);
    }
    return null;
}
if (typeof window !== "undefined") {
    window.ResonateUiEvents = {
        RESONATE_UI_EVENT_FLAG,
        uiEventSubscriptionAttach,
        pipelineBusEventSubscriptionAttach,
    };
}

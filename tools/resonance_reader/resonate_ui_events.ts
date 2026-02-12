type UiEventFlag = {
  name: string;
  owner: string;
  defaultValue: boolean;
  rolloutMode: "off" | "on" | "percentage" | "cohort" | "input-class";
  removalCondition: string;
  removalTask: string;
};

type PipelineBusLike = {
  wire: (event: string, handler: (payload: any) => void) => void;
};

export const RESONATE_UI_EVENT_FLAG: UiEventFlag = {
  name: "resonate_ui_event_subscribe",
  owner: "resonate",
  defaultValue: true,
  rolloutMode: "on",
  removalCondition: "after parity is proven",
  removalTask: "remove ui event flag once subscription is default",
};

export function pipelineBusEventSubscriptionAttach(bus: PipelineBusLike | null | undefined, state: Record<string, any>) {
  if (!bus?.wire) return null;
  bus.wire("pipeline.event", (event: any) => {
    state.lastFacadeEvent = event;
  });
  return () => {};
}

export function uiEventSubscriptionAttach(
  state: Record<string, any>,
  bus?: PipelineBusLike | null,
) {
  if (bus?.wire) {
    return pipelineBusEventSubscriptionAttach(bus, state);
  }
  return null;
}

if (typeof window !== "undefined") {
  (window as any).ResonateUiEvents = {
    RESONATE_UI_EVENT_FLAG,
    uiEventSubscriptionAttach,
    pipelineBusEventSubscriptionAttach,
  };
}

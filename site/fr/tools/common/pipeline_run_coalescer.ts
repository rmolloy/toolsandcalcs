export function pipelineRunCoalescedTriggerBuild(
  run: (trigger: string) => Promise<void>,
) {
  let active = false;
  let queuedTrigger: string | null = null;

  return async (trigger: string): Promise<void> => {
    if (active) {
      queuedTrigger = trigger;
      return;
    }
    active = true;
    try {
      await run(trigger);
      const queued = queuedTrigger;
      queuedTrigger = null;
      if (!queued) return;
      await run(queued);
    } finally {
      active = false;
    }
  };
}

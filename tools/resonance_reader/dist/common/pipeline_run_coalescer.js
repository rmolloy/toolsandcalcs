export function pipelineRunCoalescedTriggerBuild(run) {
    let active = false;
    let queuedTrigger = null;
    return async (trigger) => {
        if (active) {
            queuedTrigger = trigger;
            return;
        }
        active = true;
        try {
            await run(trigger);
            const queued = queuedTrigger;
            queuedTrigger = null;
            if (!queued)
                return;
            await run(queued);
        }
        finally {
            active = false;
        }
    };
}

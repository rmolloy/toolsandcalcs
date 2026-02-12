export function createPipelineBus() {
    const handlers = new Map();
    const context = {
        emit: (event, payload) => {
            void emit(event, payload);
        },
        log: (message) => {
            console.info("[Resonate Pipeline]", message);
        },
    };
    function wire(event, handler) {
        const list = handlers.get(event) || [];
        list.push(handler);
        handlers.set(event, list);
    }
    async function emit(event, payload) {
        const list = handlers.get(event);
        if (!list || !list.length)
            return;
        for (const handler of list) {
            await handler(payload, context);
        }
    }
    return { wire, emit, context };
}

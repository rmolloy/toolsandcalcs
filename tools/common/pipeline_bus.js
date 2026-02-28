(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createPipelineBus = createPipelineBus;
    function createPipelineBus(options = {}) {
        const handlers = new Map();
        const logPrefix = options.logPrefix || "[Pipeline]";
        const context = {
            emit: (event, payload) => {
                void emit(event, payload);
            },
            log: (message) => {
                console.info(logPrefix, message);
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
});

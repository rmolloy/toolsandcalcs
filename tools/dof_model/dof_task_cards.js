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
    exports.buildDofTaskCards = buildDofTaskCards;
    exports.restoreDofFitTaskControls = restoreDofFitTaskControls;
    exports.restoreDofSolveTaskControls = restoreDofSolveTaskControls;
    exports.buildDofTaskCard = buildDofTaskCard;
    function buildDofTaskCards(documentRef, container, cardDefinitions) {
        cardDefinitions.forEach((card) => {
            container.appendChild(buildDofTaskCard(documentRef, card));
        });
    }
    function restoreDofFitTaskControls(documentRef, panel, controls, cardDefinitions) {
        if (!controls || !panel)
            return;
        cardDefinitions.forEach((card) => {
            var _a, _b;
            (_a = card.fieldIds) === null || _a === void 0 ? void 0 : _a.forEach((fieldId) => {
                var _a;
                appendDofTaskCardElement(controls, (_a = documentRef.getElementById(fieldId)) === null || _a === void 0 ? void 0 : _a.closest(".dof-fit-field"));
            });
            (_b = card.actionIds) === null || _b === void 0 ? void 0 : _b.forEach((actionId) => {
                appendDofTaskCardElement(controls, documentRef.getElementById(actionId));
            });
        });
        appendDofTaskCardElement(panel, documentRef.getElementById("fit_status"));
    }
    function restoreDofSolveTaskControls(documentRef, panel, actions, cardDefinitions) {
        if (!actions || !panel)
            return;
        cardDefinitions.forEach((card) => {
            var _a, _b, _c, _d;
            (_a = card.optionIds) === null || _a === void 0 ? void 0 : _a.forEach((optionId) => {
                var _a;
                appendDofTaskCardElement(panel, (_a = documentRef.getElementById(optionId)) === null || _a === void 0 ? void 0 : _a.closest(".dof-guided-option"));
            });
            (_b = card.actionIds) === null || _b === void 0 ? void 0 : _b.forEach((actionId) => {
                appendDofTaskCardElement(actions, documentRef.getElementById(actionId));
            });
            if ((_c = card.actionIds) === null || _c === void 0 ? void 0 : _c.length)
                panel.appendChild(actions);
            (_d = card.panelIds) === null || _d === void 0 ? void 0 : _d.forEach((panelId) => {
                appendDofTaskCardElement(panel, documentRef.getElementById(panelId));
            });
        });
    }
    function buildDofTaskCard(documentRef, card) {
        const cardElement = documentRef.createElement("div");
        cardElement.className = `mode-card mode-${card.key}`;
        const title = documentRef.createElement("div");
        title.className = "dof-card-title";
        title.innerHTML = buildDofTaskCardTitle(card);
        const body = documentRef.createElement("div");
        body.className = "task-card-fields";
        appendDofTaskCardCopy(documentRef, body, card.copy);
        appendDofTaskCardFields(documentRef, body, card.fieldIds);
        appendDofTaskCardOptions(documentRef, body, card.optionIds);
        appendDofTaskCardActions(documentRef, body, card.actionIds);
        appendDofTaskCardPanels(documentRef, body, card.panelIds);
        appendDofTaskCardStatus(documentRef, body, card.statusId);
        cardElement.append(title, body);
        return cardElement;
    }
    function buildDofTaskCardTitle(card) {
        return `<div class="mode-label">${card.label}<span class="mode-label-alias">${card.alias}</span></div><span class="badge">${card.badgeText}</span>`;
    }
    function appendDofTaskCardCopy(documentRef, body, copyText) {
        if (!copyText)
            return;
        const copy = documentRef.createElement("p");
        copy.className = "task-card-copy";
        copy.textContent = copyText;
        body.appendChild(copy);
    }
    function appendDofTaskCardFields(documentRef, body, fieldIds) {
        fieldIds === null || fieldIds === void 0 ? void 0 : fieldIds.forEach((fieldId) => {
            var _a;
            appendDofTaskCardElement(body, (_a = documentRef.getElementById(fieldId)) === null || _a === void 0 ? void 0 : _a.closest(".dof-fit-field"));
        });
    }
    function appendDofTaskCardOptions(documentRef, body, optionIds) {
        optionIds === null || optionIds === void 0 ? void 0 : optionIds.forEach((optionId) => {
            var _a;
            appendDofTaskCardElement(body, (_a = documentRef.getElementById(optionId)) === null || _a === void 0 ? void 0 : _a.closest(".dof-guided-option"));
        });
    }
    function appendDofTaskCardActions(documentRef, body, actionIds) {
        if (!(actionIds === null || actionIds === void 0 ? void 0 : actionIds.length))
            return;
        const actions = documentRef.createElement("div");
        actions.className = "task-card-actions";
        actionIds.forEach((actionId) => {
            appendDofTaskCardElement(actions, documentRef.getElementById(actionId));
        });
        body.appendChild(actions);
    }
    function appendDofTaskCardPanels(documentRef, body, panelIds) {
        panelIds === null || panelIds === void 0 ? void 0 : panelIds.forEach((panelId) => {
            appendDofTaskCardElement(body, documentRef.getElementById(panelId));
        });
    }
    function appendDofTaskCardStatus(documentRef, body, statusId) {
        if (!statusId)
            return;
        appendDofTaskCardElement(body, documentRef.getElementById(statusId));
    }
    function appendDofTaskCardElement(parent, element) {
        if (element)
            parent.appendChild(element);
    }
});

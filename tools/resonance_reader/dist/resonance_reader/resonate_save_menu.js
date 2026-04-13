export async function openResonanceSaveMenu(args) {
    if (!args.anchor) {
        return null;
    }
    return await new Promise((resolve) => {
        let settled = false;
        const closeWith = (result) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            panel.remove();
            resolve(result);
        };
        const panel = resonanceSaveMenuPanelBuild(args.items, closeWith);
        const cleanup = resonanceSaveMenuLifecycleBind(panel, closeWith);
        document.body.appendChild(panel);
        resonanceSaveMenuPosition(panel, args.anchor);
        requestAnimationFrame(() => {
            panel.dataset.open = "true";
        });
        panel.querySelectorAll("[data-save-menu-key]").forEach((button) => {
            button.addEventListener("click", () => closeWith(button.dataset.saveMenuKey || null), { once: true });
        });
    });
}
function resonanceSaveMenuPanelBuild(items, resolve) {
    const panel = document.createElement("div");
    panel.className = "save-menu-panel";
    panel.setAttribute("role", "menu");
    panel.innerHTML = items.map(resonanceSaveMenuItemMarkupBuild).join("");
    panel.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            resolve(null);
        }
    });
    return panel;
}
function resonanceSaveMenuItemMarkupBuild(item) {
    const description = item.description
        ? `<span class="save-menu-description">${resonanceSaveMenuEscapeHtml(item.description)}</span>`
        : "";
    return `<button type="button" class="save-menu-item" role="menuitem" data-save-menu-key="${resonanceSaveMenuEscapeHtml(item.key)}"><span class="save-menu-label">${resonanceSaveMenuEscapeHtml(item.label)}</span>${description}</button>`;
}
function resonanceSaveMenuLifecycleBind(panel, resolve) {
    const onPointerDown = (event) => {
        if (!panel.contains(event.target)) {
            resolve(null);
        }
    };
    const onResize = () => resolve(null);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
        document.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onResize, true);
    };
}
function resonanceSaveMenuPosition(panel, anchor) {
    const rect = anchor.getBoundingClientRect();
    panel.style.left = `${Math.round(window.scrollX + rect.left)}px`;
    panel.style.top = `${Math.round(window.scrollY + rect.bottom + 8)}px`;
    panel.style.minWidth = `${Math.round(rect.width)}px`;
}
function resonanceSaveMenuEscapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function resonanceToolNavigate(href, runtime = window) {
    if (runtime.ToolFullscreenNavigation?.navigate(href))
        return;
    runtime.location.href = href;
}

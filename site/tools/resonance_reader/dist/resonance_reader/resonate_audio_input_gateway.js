export async function settingsAudioInputDevicesRead() {
    const audio = settingsAudioApiGet();
    if (typeof audio?.listAudioInputDevices !== "function")
        return [];
    try {
        return await audio.listAudioInputDevices();
    }
    catch (error) {
        console.warn("[Resonance Reader] audio input list failed", error);
        return [];
    }
}
export function settingsAudioInputDeviceIdRead() {
    const audio = settingsAudioApiGet();
    if (typeof audio?.getAudioInputDeviceId !== "function")
        return null;
    return audio.getAudioInputDeviceId();
}
export function settingsAudioInputDeviceIdWrite(value) {
    settingsAudioApiGet()?.setAudioInputDeviceId?.(value || null);
}
function settingsAudioApiGet() {
    return window.FFTAudio;
}

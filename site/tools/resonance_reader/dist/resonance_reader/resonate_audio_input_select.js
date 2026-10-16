import { settingsAudioInputDeviceIdRead, settingsAudioInputDeviceIdWrite, settingsAudioInputDevicesRead, } from "./resonate_audio_input_gateway.js?rev=ad8911223a7b";
import { SETTINGS_IDS } from "./resonate_settings_ids.js?rev=ad8911223a7b";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=ad8911223a7b";
export function settingsAudioInputBind() {
    settingsAudioInputSelectGet()?.addEventListener("change", (event) => {
        const select = event.currentTarget;
        settingsAudioInputDeviceIdWrite(select.value);
    });
}
export async function settingsAudioInputsRefresh() {
    const select = settingsAudioInputSelectGet();
    if (!select)
        return;
    settingsAudioInputOptionsRender(select, [], settingsAudioInputDeviceIdRead());
    const devices = await settingsAudioInputDevicesRead();
    settingsAudioInputOptionsRender(select, devices, settingsAudioInputDeviceIdRead());
}
function settingsAudioInputOptionsRender(select, devices, selectedDeviceId) {
    select.innerHTML = "";
    select.appendChild(settingsOptionBuild("", resonanceLocalizedMessages.settingsAudioDefaultMicrophone, !selectedDeviceId));
    devices.forEach((device, index) => {
        select.appendChild(settingsOptionBuild(device.deviceId, settingsAudioDeviceLabelRead(device, index), device.deviceId === selectedDeviceId));
    });
}
function settingsAudioDeviceLabelRead(device, index) {
    return device.label || resonanceLocalizedMessages.settingsAudioMicrophoneTemplate.replace("{number}", String(index + 1));
}
function settingsOptionBuild(value, label, selected) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = selected;
    return option;
}
function settingsAudioInputSelectGet() {
    return document.getElementById(SETTINGS_IDS.audioInput);
}

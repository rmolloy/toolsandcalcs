export async function settingsAudioInputDevicesRead(): Promise<MediaDeviceInfo[]> {
  const audio = settingsAudioApiGet();
  if (typeof audio?.listAudioInputDevices !== "function") return [];

  try {
    return await audio.listAudioInputDevices();
  } catch (error) {
    console.warn("[Resonance Reader] audio input list failed", error);
    return [];
  }
}

export function settingsAudioInputDeviceIdRead(): string | null {
  const audio = settingsAudioApiGet();
  if (typeof audio?.getAudioInputDeviceId !== "function") return null;
  return audio.getAudioInputDeviceId();
}

export function settingsAudioInputDeviceIdWrite(value: string) {
  settingsAudioApiGet()?.setAudioInputDeviceId?.(value || null);
}

function settingsAudioApiGet() {
  return (window as any).FFTAudio;
}

(() => {
  interface WaveData {
    timeMs: number[];
    wave: number[] | Float64Array;
    sampleRate: number;
    fullLengthMs?: number;
  }

  interface FFTAudioState {
    currentBuffer: AudioBuffer | null;
    currentSampleRate: number | null;
    currentWave: WaveData | null;
    recordedChunks: Blob[];
    mediaRecorder: MediaRecorder | null;
    recordingActive: boolean;
    playbackCtx: AudioContext | null;
    playbackSource: AudioBufferSourceNode | null;
    playbackActive: boolean;
  }

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    FFTState?: FFTAudioState;
    FFTAudio?: any;
  };
  const state = (scope.FFTState ?? {}) as FFTAudioState;

  const createAudioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

  function generateDemoWave(sampleLengthMs = 1500): WaveData {
    const sampleRate = 44100;
    const samples = Math.max(64, Math.round((sampleLengthMs / 1000) * sampleRate));
    const time = new Array<number>(samples);
    const wave = new Array<number>(samples);

    const freqs = [98, 178, 220, 262];
    const decay = 3.2;
    for (let i = 0; i < samples; i += 1) {
      const t = i / sampleRate;
      time[i] = t * 1000;
      let y = 0;
      freqs.forEach((f, idx) => {
        y += (Math.sin(2 * Math.PI * f * t) * Math.exp(-decay * t)) / (idx + 1);
      });
      wave[i] = y;
    }

    return { timeMs: time, wave, sampleRate };
  }

  async function handleFile(file: File | null): Promise<void> {
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = createAudioCtx();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    state.currentBuffer = audioBuffer;
    state.currentSampleRate = audioBuffer.sampleRate;
    const channel = audioBuffer.getChannelData(0);
    const fullLengthMs = (channel.length / state.currentSampleRate) * 1000;
    state.currentWave = {
      wave: Float64Array.from(channel),
      timeMs: Array.from(channel, (_v, i) => (i / state.currentSampleRate!) * 1000),
      sampleRate: state.currentSampleRate,
      fullLengthMs,
    };
  }

  function encodeWav(samples: ArrayLike<number>, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    const floatTo16 = (outOffset: number, input: ArrayLike<number>) => {
      for (let i = 0; i < input.length; i += 1) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(outOffset + (i * 2), s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    floatTo16(44, samples);
    return new Blob([buffer], { type: "audio/wav" });
  }

  function saveCurrentAudio(): void {
    const samples = state.currentBuffer
      ? state.currentBuffer.getChannelData(0)
      : state.currentWave?.wave;
    const sr = state.currentBuffer?.sampleRate || state.currentWave?.sampleRate;
    if (!samples || !sr) return;
    const blob = encodeWav(samples, sr);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fft_capture.wav";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function startRecording(onDone?: () => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordedChunks = [];
    state.mediaRecorder = new MediaRecorder(stream);
    state.recordingActive = true;
    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) state.recordedChunks.push(e.data);
    };
    state.mediaRecorder.onstop = async () => {
      const blob = new Blob(state.recordedChunks, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = createAudioCtx();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      state.currentBuffer = audioBuffer;
      state.currentSampleRate = audioBuffer.sampleRate;
      const channel = audioBuffer.getChannelData(0);
      const fullLengthMs = (channel.length / state.currentSampleRate) * 1000;
      state.currentWave = {
        wave: Float64Array.from(channel),
        timeMs: Array.from(channel, (_v, i) => (i / state.currentSampleRate!) * 1000),
        sampleRate: state.currentSampleRate,
        fullLengthMs,
      };
      state.recordingActive = false;
      if (onDone) onDone();
    };
    state.mediaRecorder.start();
  }

  function stopRecording(): void {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
      state.recordingActive = false;
    }
  }

  function playCurrent(onEnd?: () => void): boolean {
    if (!state.currentBuffer) return false;
    if (state.playbackActive) stopPlayback();
    state.playbackCtx = createAudioCtx();
    state.playbackSource = state.playbackCtx.createBufferSource();
    state.playbackSource.buffer = state.currentBuffer;
    state.playbackSource.connect(state.playbackCtx.destination);
    state.playbackActive = true;
    state.playbackSource.onended = () => {
      stopPlayback();
      if (onEnd) onEnd();
    };
    state.playbackSource.start();
    return true;
  }

  function stopPlayback(): void {
    if (state.playbackSource) {
      try { state.playbackSource.stop(); } catch { /* noop */ }
      state.playbackSource.disconnect();
      state.playbackSource = null;
    }
    if (state.playbackCtx) {
      try { state.playbackCtx.close(); } catch { /* noop */ }
      state.playbackCtx = null;
    }
    state.playbackActive = false;
  }

  function stopAll(): void {
    stopRecording();
    stopPlayback();
  }

  // --- Tone generator for hover-follow ---
  let toneCtx: AudioContext | null = null;
  let toneOsc: OscillatorNode | null = null;
  let toneGain: GainNode | null = null;
  let toneEnabled = false;

  function setToneEnabled(flag: boolean) {
    toneEnabled = !!flag;
    if (!toneEnabled) stopTone();
  }

  function ensureTone() {
    if (!toneCtx) {
      toneCtx = createAudioCtx();
      toneGain = toneCtx.createGain();
      toneGain.gain.value = 0.08;
      toneGain.connect(toneCtx.destination);
      toneOsc = toneCtx.createOscillator();
      toneOsc.type = "sine";
      toneOsc.frequency.value = 220;
      toneOsc.connect(toneGain);
      toneOsc.start();
    }
    if (toneCtx.state === "suspended") {
      toneCtx.resume().catch(() => {});
    }
  }

  function updateToneFreq(freq: number | null | undefined) {
    if (!toneEnabled || !Number.isFinite(freq)) return;
    ensureTone();
    toneOsc!.frequency.setValueAtTime(freq as number, toneCtx!.currentTime);
  }

  function stopTone() {
    if (toneOsc) {
      try { toneOsc.stop(); } catch { /* noop */ }
      toneOsc.disconnect();
      toneOsc = null;
    }
    if (toneGain) {
      toneGain.disconnect();
      toneGain = null;
    }
    if (toneCtx) {
      try { toneCtx.close(); } catch { /* noop */ }
      toneCtx = null;
    }
  }

  scope.FFTAudio = {
    generateDemoWave,
    handleFile,
    saveCurrentAudio,
    startRecording,
    stopRecording,
    playCurrent,
    stopPlayback,
    stopAll,
    isRecordingActive: () => state.recordingActive,
    isPlaybackActive: () => state.playbackActive,
    setToneEnabled,
    updateToneFreq,
    stopTone,
  };
})();

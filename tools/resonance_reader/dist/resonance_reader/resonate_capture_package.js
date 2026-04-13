import { renderPayloadBuildFromState } from "./resonate_render_events.js";
import { buildToolDocumentHeader } from "../common/tool_document.js";
export async function resonanceCapturePackageZipBlobBuild(args) {
    const [stateBlob, wavBlob, plotBlob] = await Promise.all([
        resonanceCaptureStateBlobBuild(args),
        resonanceCaptureWaveBlobBuild(args.state),
        resonanceCapturePlotPngBlobBuild(args.plotElement),
    ]);
    return new Blob([
        resonanceCaptureArrayBufferBuildFromBytes(resonanceCaptureZipBytesBuild([
            await resonanceCaptureFileBuild("state.json", stateBlob),
            await resonanceCaptureFileBuild("source.wav", wavBlob),
            await resonanceCaptureFileBuild("plot.png", plotBlob),
        ])),
    ], { type: "application/zip" });
}
export function resonanceCaptureStateJsonBuild(args) {
    return {
        ...buildToolDocumentHeader({
            toolDocumentType: "RESONANCE_READER_SAVE",
            toolId: "resonance_reader",
            toolVersion: args.toolVersion,
            savedAtIso: args.savedAtIso,
        }),
        packageVersion: 1,
        toolId: "resonance_reader",
        toolVersion: args.toolVersion,
        savedAt: args.savedAtIso,
        measureMode: String(args.state.measureMode ?? ""),
        recordingLabel: args.recordingLabel,
        renderPayload: renderPayloadBuildFromState(args.state),
        currentWave: buildResonanceCaptureStoredWave(resonanceCaptureWaveResolve(args.state)),
        plateMaterialMeasurements: resonanceCapturePlainValueClone(args.state.plateMaterialMeasurements ?? null),
        selection: {
            viewRangeMs: resonanceCaptureRangeClone(args.state.viewRangeMs),
            noteSelectionRangeMs: resonanceCaptureRangeClone(args.state.noteSelectionRangeMs),
        },
        customMeasurements: resonanceCapturePlainValueClone(args.state.customMeasurements ?? []),
        summary: resonanceCaptureSummaryBuild(args.state),
    };
}
export function resonanceCaptureWaveBlobBuild(state) {
    const wave = resonanceCaptureWaveResolve(state);
    if (!wave) {
        throw new Error("Waveform capture is unavailable.");
    }
    return resonanceCaptureWavBlobBuild(wave.samples, wave.sampleRate);
}
export async function resonanceCapturePlotPngBlobBuild(plotElement) {
    if (!plotElement) {
        throw new Error("Frequency response plot is unavailable.");
    }
    const dataUrl = await resonanceCapturePlotDataUrlBuild(plotElement);
    return resonanceCaptureBlobBuildFromDataUrl(dataUrl);
}
export function resonanceCaptureZipBytesBuild(files) {
    const writer = resonanceCaptureZipWriterCreate();
    files.forEach((file) => writer.addFile(file));
    return writer.finish();
}
function resonanceCaptureStateBlobBuild(args) {
    return new Blob([
        JSON.stringify(resonanceCaptureStateJsonBuild(args), null, 2),
    ], { type: "application/json" });
}
function resonanceCaptureSummaryBuild(state) {
    const renderPayload = renderPayloadBuildFromState(state);
    return {
        modeCardCount: Array.isArray(renderPayload?.cards) ? renderPayload.cards.length : 0,
        detectedModeCount: Array.isArray(renderPayload?.modes) ? renderPayload.modes.length : 0,
        spectrumPointCount: Array.isArray(renderPayload?.freqs) ? renderPayload.freqs.length : 0,
    };
}
function resonanceCaptureRangeClone(value) {
    if (!Array.isArray(value) || value.length < 2) {
        return null;
    }
    return [Number(value[0]), Number(value[1])];
}
function resonanceCapturePlainValueClone(value) {
    return JSON.parse(JSON.stringify(value));
}
function resonanceCaptureWaveResolve(state) {
    const currentWave = readResonanceCaptureRuntimeWave() ?? state.currentWave;
    const samples = currentWave?.wave;
    const sampleRate = Number(currentWave?.sampleRate);
    if (!samples || !Number.isFinite(sampleRate) || sampleRate <= 0) {
        return null;
    }
    return { samples, sampleRate };
}
function readResonanceCaptureRuntimeWave() {
    var runtime = globalThis;
    return runtime.FFTState?.currentWave || null;
}
function buildResonanceCaptureStoredWave(wave) {
    if (!wave) {
        return null;
    }
    return {
        sampleRate: wave.sampleRate,
        samplesBase64: resonanceCaptureSamplesBase64Build(wave.samples),
    };
}
function resonanceCaptureSamplesBase64Build(samples) {
    const floatSamples = new Float32Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
        floatSamples[index] = Number(samples[index] || 0);
    }
    return resonanceCaptureBase64BuildFromBytes(new Uint8Array(floatSamples.buffer));
}
function resonanceCaptureBase64BuildFromBytes(bytes) {
    const nodeBuffer = readResonanceCaptureNodeBuffer();
    if (nodeBuffer) {
        return nodeBuffer.from(bytes).toString("base64");
    }
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
}
function readResonanceCaptureNodeBuffer() {
    return globalThis.Buffer || null;
}
function resonanceCaptureWavBlobBuild(samples, sampleRate) {
    const bytes = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(bytes);
    resonanceCaptureRiffHeaderWrite(view, samples.length, sampleRate);
    resonanceCapturePcmSamplesWrite(view, samples);
    return new Blob([bytes], { type: "audio/wav" });
}
function resonanceCaptureRiffHeaderWrite(view, sampleCount, sampleRate) {
    resonanceCaptureAsciiWrite(view, 0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    resonanceCaptureAsciiWrite(view, 8, "WAVE");
    resonanceCaptureAsciiWrite(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    resonanceCaptureAsciiWrite(view, 36, "data");
    view.setUint32(40, sampleCount * 2, true);
}
function resonanceCaptureAsciiWrite(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) {
        view.setUint8(offset + index, text.charCodeAt(index));
    }
}
function resonanceCapturePcmSamplesWrite(view, samples) {
    for (let index = 0; index < samples.length; index += 1) {
        view.setInt16(44 + index * 2, resonanceCapturePcmSampleBuild(samples[index]), true);
    }
}
function resonanceCapturePcmSampleBuild(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}
async function resonanceCapturePlotDataUrlBuild(plotElement) {
    const plotly = window.Plotly;
    if (typeof plotly?.toImage !== "function") {
        throw new Error("Plot export is unavailable.");
    }
    return await plotly.toImage(plotElement, {
        format: "png",
        width: plotElement.clientWidth || 1200,
        height: plotElement.clientHeight || 600,
    });
}
function resonanceCaptureBlobBuildFromDataUrl(dataUrl) {
    const [header, body] = dataUrl.split(",", 2);
    const match = /^data:(.*?);base64$/.exec(header ?? "");
    if (!match || !body) {
        throw new Error("Plot export returned an invalid image.");
    }
    return new Blob([resonanceCaptureArrayBufferBuildFromBytes(resonanceCaptureBytesBuildFromBase64(body))], { type: match[1] });
}
function resonanceCaptureBytesBuildFromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}
async function resonanceCaptureFileBuild(name, blob) {
    return {
        name,
        bytes: new Uint8Array(await blob.arrayBuffer()),
        lastModifiedMs: Date.now(),
    };
}
function resonanceCaptureZipWriterCreate() {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    return {
        addFile(file) {
            const nameBytes = resonanceCaptureUtf8BytesBuild(file.name);
            const crc32 = resonanceCaptureCrc32Build(file.bytes);
            const dosTime = resonanceCaptureDosDateTimeBuild(file.lastModifiedMs ?? Date.now());
            const localHeader = resonanceCaptureZipLocalHeaderBuild(nameBytes, file.bytes, crc32, dosTime);
            localParts.push(localHeader, file.bytes);
            centralParts.push(resonanceCaptureZipCentralHeaderBuild(nameBytes, file.bytes, crc32, dosTime, offset));
            offset += localHeader.length + file.bytes.length;
        },
        finish() {
            const centralStart = offset;
            const centralLength = centralParts.reduce((sum, part) => sum + part.length, 0);
            const endRecord = resonanceCaptureZipEndRecordBuild(centralParts.length, centralLength, centralStart);
            return resonanceCaptureBytesConcat([...localParts, ...centralParts, endRecord]);
        },
    };
}
function resonanceCaptureZipLocalHeaderBuild(nameBytes, fileBytes, crc32, dosTime) {
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dosTime.time, true);
    view.setUint16(12, dosTime.date, true);
    view.setUint32(14, crc32 >>> 0, true);
    view.setUint32(18, fileBytes.length, true);
    view.setUint32(22, fileBytes.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);
    return header;
}
function resonanceCaptureZipCentralHeaderBuild(nameBytes, fileBytes, crc32, dosTime, localOffset) {
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, dosTime.time, true);
    view.setUint16(14, dosTime.date, true);
    view.setUint32(16, crc32 >>> 0, true);
    view.setUint32(20, fileBytes.length, true);
    view.setUint32(24, fileBytes.length, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, localOffset, true);
    header.set(nameBytes, 46);
    return header;
}
function resonanceCaptureZipEndRecordBuild(fileCount, centralLength, centralStart) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, fileCount, true);
    view.setUint16(10, fileCount, true);
    view.setUint32(12, centralLength, true);
    view.setUint32(16, centralStart, true);
    view.setUint16(20, 0, true);
    return record;
}
function resonanceCaptureUtf8BytesBuild(text) {
    return new TextEncoder().encode(text);
}
function resonanceCaptureBytesConcat(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
        bytes.set(part, offset);
        offset += part.length;
    });
    return bytes;
}
function resonanceCaptureArrayBufferBuildFromBytes(bytes) {
    return new Uint8Array(bytes).buffer;
}
function resonanceCaptureDosDateTimeBuild(timestampMs) {
    const date = new Date(timestampMs);
    const year = Math.max(1980, date.getFullYear());
    return {
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    };
}
function resonanceCaptureCrc32Build(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
        crc = resonanceCaptureCrc32TableRead((crc ^ bytes[index]) & 0xff) ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function resonanceCaptureCrc32TableRead(index) {
    const table = resonanceCaptureCrc32TableRead.table
        ?? (resonanceCaptureCrc32TableRead.table = resonanceCaptureCrc32TableBuild());
    return table[index];
}
function resonanceCaptureCrc32TableBuild() {
    const table = new Uint32Array(256);
    for (let index = 0; index < table.length; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        }
        table[index] = value >>> 0;
    }
    return table;
}

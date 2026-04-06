import { FrameHeader, OutputKind } from "@/types/simulation";

const HEADER_SIZE = 64;
const MAGIC = 0x47335633;

export function decodeFrame(
  input: ArrayBuffer | Uint8Array
): {
  header: FrameHeader;
  data: Float32Array | Float64Array;
} | null {
  // Normalize input: always work with a standalone ArrayBuffer.
  // Typed-array constructors (Float32Array, Float64Array) require the
  // underlying buffer's byteOffset to be aligned, so we copy into a fresh
  // ArrayBuffer when the input is a view with a non-zero offset.
  let raw: ArrayBuffer;
  if (input instanceof Uint8Array) {
    // Copy to guarantee alignment and a clean byteOffset of 0
    const copy = new Uint8Array(input.byteLength);
    copy.set(input);
    raw = copy.buffer;
  } else {
    raw = input;
  }

  if (raw.byteLength < HEADER_SIZE) return null;

  const view = new DataView(raw);
  const magic = view.getUint32(0, true);
  if (magic !== MAGIC) return null;

  const dtypeVal = view.getUint32(20, true);
  const header: FrameHeader = {
    frameId: view.getUint32(4, true),
    outputKind: view.getUint32(8, true) as OutputKind,
    elementCount: view.getUint32(12, true),
    components: view.getUint32(16, true),
    dtype: dtypeVal === 0 ? "f32" : "f64",
    simTime: view.getFloat64(24, true),
    lyapunov: view.getFloat64(32, true),
    energy: view.getFloat64(40, true),
    maxDivergence: view.getFloat64(48, true),
  };

  if (header.elementCount === 0) {
    return { header, data: new Float32Array(0) };
  }

  const payloadOffset = HEADER_SIZE;
  const elementSize = header.dtype === "f32" ? 4 : 8;
  const expectedBytes =
    header.elementCount * header.components * elementSize;

  if (raw.byteLength < payloadOffset + expectedBytes) {
    // For variable-length payloads (bodies + trails), just use what we have
    const availableBytes = raw.byteLength - payloadOffset;
    const count = Math.floor(
      availableBytes / elementSize
    );
    if (header.dtype === "f32") {
      return {
        header,
        data: new Float32Array(raw, payloadOffset, count),
      };
    } else {
      return {
        header,
        data: new Float64Array(raw, payloadOffset, count),
      };
    }
  }

  const data =
    header.dtype === "f32"
      ? new Float32Array(raw, payloadOffset, header.elementCount * header.components)
      : new Float64Array(raw, payloadOffset, header.elementCount * header.components);

  return { header, data };
}

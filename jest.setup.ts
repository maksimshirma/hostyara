import { TextDecoder, TextEncoder } from "node:util";
import "@testing-library/jest-dom";

// jsdom doesn't provide these globals; react-router-dom (among others)
// expects them to exist at module load time.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

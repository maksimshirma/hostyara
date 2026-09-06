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
// MessageChannel/MessagePort (T16's iframe transport) are deliberately NOT
// polyfilled globally here: React's scheduler checks for MessageChannel at
// module-eval time and switches its own internal task scheduling to use
// it when present, leaking a port in every React Testing Library test in
// this jsdom environment. The handful of test files that actually need
// MessageChannel polyfill it locally instead (see
// packages/event-bus/src/__jest__/createMessagePortChannel.test.ts).

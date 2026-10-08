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

// jsdom has no Fetch API classes. TanStack Router builds every redirect()
// as a Response (status + Location header) and recognises it with
// `instanceof Response`; this minimal pair is all it needs.
if (typeof globalThis.Headers === "undefined") {
  class HeadersStub {
    private readonly values = new Map<string, string>();
    constructor(init?: Record<string, string> | Array<[string, string]>) {
      const entries = Array.isArray(init) ? init : Object.entries(init ?? {});
      for (const [name, value] of entries) this.set(name, value);
    }
    get(name: string): string | null {
      return this.values.get(name.toLowerCase()) ?? null;
    }
    set(name: string, value: string): void {
      this.values.set(name.toLowerCase(), value);
    }
    has(name: string): boolean {
      return this.values.has(name.toLowerCase());
    }
  }
  globalThis.Headers = HeadersStub as unknown as typeof globalThis.Headers;
}
if (typeof globalThis.Response === "undefined") {
  class ResponseStub {
    readonly status: number;
    readonly headers: Headers;
    constructor(_body: unknown, init?: { status?: number; headers?: Headers }) {
      this.status = init?.status ?? 200;
      this.headers = init?.headers ?? new Headers();
    }
    get ok(): boolean {
      return this.status >= 200 && this.status < 300;
    }
  }
  globalThis.Response = ResponseStub as unknown as typeof globalThis.Response;
}

export type SlotErrorReason =
  | { kind: "not-installed" }
  | { kind: "incompatible-contract"; expectedMajor: string; actualMajor: string }
  | { kind: "timeout" }
  | { kind: "load-failed"; message: string };

export type SlotStatus =
  | { kind: "idle" }
  | { kind: "loading"; appName: string }
  | { kind: "mounted" }
  | { kind: "error"; appName: string; reason: SlotErrorReason };

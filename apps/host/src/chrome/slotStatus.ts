export type SlotErrorReason =
  | { kind: "not-installed" }
  // Installed, but this person has no grant yet: offer to request access.
  | { kind: "no-access"; requested: boolean }
  | { kind: "not-member" }
  | { kind: "access-unavailable" }
  | { kind: "incompatible-contract"; expectedMajor: string; actualMajor: string }
  | { kind: "timeout" }
  | { kind: "load-failed"; message: string };

export type SlotStatus =
  | { kind: "idle" }
  | { kind: "loading"; appName: string }
  | { kind: "mounted" }
  | { kind: "error"; appName: string; reason: SlotErrorReason };

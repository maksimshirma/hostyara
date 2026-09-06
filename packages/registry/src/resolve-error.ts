export type ResolveError =
  | { kind: "unknown-app"; appId: string }
  | { kind: "incompatible-contract"; appId: string; expectedMajor: string; actualMajor: string };

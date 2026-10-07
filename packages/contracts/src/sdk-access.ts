import { Permission } from "./permissions";

export type AccessLevel = "view" | "edit";

// The user's access to the calling app in the current household (IA 13.9).
// Apps ask `can` at the moment they need an answer and re-render on
// `subscribe` instead of caching a snapshot — rights can change while the
// app is open. The backend still enforces everything; this only drives UI.
export interface SdkAccess {
  // Always "view" in public mode.
  readonly level: AccessLevel;
  // "edit" checks the grant level; any other string is one of the app's
  // confirmed manifest permissions.
  can(action: "edit" | Permission): boolean;
  // Called after the user's role, grant or the app's permissions changed.
  subscribe(callback: () => void): () => void;
  // Opens the shell's access-request dialog; resolves once the request is sent.
  requestAccess(level: AccessLevel): Promise<void>;
}

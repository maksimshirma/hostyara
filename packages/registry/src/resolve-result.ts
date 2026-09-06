import { AppManifest } from "@hostyara/contracts";
import { ResolveError } from "./resolve-error";

export type ResolveResult =
  | { ok: true; manifest: AppManifest }
  | { ok: false; error: ResolveError };

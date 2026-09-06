export type RemoteLoadErrorKind = "timeout" | "load-failed";

export class RemoteLoadError extends Error {
  readonly kind: RemoteLoadErrorKind;
  readonly appId: string;

  constructor(kind: RemoteLoadErrorKind, appId: string, message: string) {
    super(message);
    this.name = "RemoteLoadError";
    this.kind = kind;
    this.appId = appId;
  }
}

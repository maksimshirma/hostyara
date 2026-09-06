export interface AppMount {
  // "module-federation" (default when omitted) loads remoteEntry as a JS
  // container in the host's own realm; "iframe" treats remoteEntry as a
  // static HTML page loaded in a sandboxed iframe, connected over a
  // MessagePort-based HostChannel (T16).
  type?: "module-federation" | "iframe";
  remoteEntry: string;
  exposed: string;
  styles: string[];
}

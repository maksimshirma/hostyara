export interface ModuleFederationRemote {
  kind: "module-federation";
  remoteEntryUrl: string;
  scope: string;
  module: string;
}

export interface IframeRemote {
  kind: "iframe";
  entryUrl: string;
  sandbox?: string[];
}

export type RemoteDescriptor = ModuleFederationRemote | IframeRemote;

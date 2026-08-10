import { AppManifest, HostContext, MicrofrontendProps, User } from "./index";

describe("@hostyara/contract", () => {
  it("types compose into valid values", () => {
    const user: User = { id: "u1", name: "Ada", email: "ada@example.com" };
    const manifest: AppManifest = {
      id: "app1",
      name: "Example App",
      remoteEntryUrl: "https://example.com/remoteEntry.js",
      routes: ["/example"],
      version: "1.0.0",
      permissions: ["read"],
      featureFlags: ["new-ui"],
      status: "healthy",
    };
    const hostContext: HostContext = { userId: user.id, permissions: manifest.permissions };
    const props: MicrofrontendProps = { hostContext, container: document.createElement("div") };

    expect(props.hostContext.userId).toBe("u1");
    expect(manifest.status).toBe("healthy");
  });
});

import { AccessSnapshot } from "../../api/accessTracker";
import { decideAppAccess } from "../appAccess";

const SNAPSHOT: AccessSnapshot = {
  role: "member",
  installedApps: ["recipes", "budget"],
  grants: { recipes: "view" },
  permissions: {},
};

describe("decideAppAccess", () => {
  it("allows an installed app with a grant", () => {
    expect(decideAppAccess("ready", SNAPSHOT, "recipes")).toBe("allow");
  });

  it("asks for access to an installed app without a grant", () => {
    expect(decideAppAccess("ready", SNAPSHOT, "budget")).toBe("no-grant");
  });

  it("reports an app that is not installed", () => {
    expect(decideAppAccess("ready", SNAPSHOT, "tasks")).toBe("not-installed");
  });

  it("waits while access is loading", () => {
    expect(decideAppAccess("loading", null, "recipes")).toBe("pending");
    expect(decideAppAccess("idle", null, "recipes")).toBe("pending");
  });

  it("keeps the last snapshot while a reload is in flight", () => {
    expect(decideAppAccess("loading", SNAPSHOT, "recipes")).toBe("allow");
  });

  it("maps tracker failures", () => {
    expect(decideAppAccess("forbidden", null, "recipes")).toBe("not-member");
    expect(decideAppAccess("error", null, "recipes")).toBe("unavailable");
  });
});

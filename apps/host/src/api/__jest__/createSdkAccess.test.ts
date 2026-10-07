import { AccessSnapshot, AccessTracker } from "../accessTracker";
import { BffClient } from "../bffClient";
import { createSdkAccess } from "../createSdkAccess";

function setup(snapshot: AccessSnapshot | null, hid: string | null = "h1") {
  let current = snapshot;
  const listeners = new Set<() => void>();
  const tracker = {
    getHid: () => hid,
    getSnapshot: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as AccessTracker;
  const request = jest.fn().mockResolvedValue({ id: "r1" });
  const access = createSdkAccess(tracker, { request } as BffClient, "recipes");
  return {
    access,
    request,
    change(next: AccessSnapshot) {
      current = next;
      for (const listener of listeners) listener();
    },
  };
}

const snapshot = (grant?: "view" | "edit", permissions: string[] = []): AccessSnapshot => ({
  role: "member",
  installedApps: ["recipes"],
  grants: grant ? { recipes: grant } : {},
  permissions: { recipes: permissions },
});

describe("createSdkAccess", () => {
  it("reflects the grant level and confirmed permissions", () => {
    const { access } = setup(snapshot("edit", ["storage.own"]));

    expect(access.level).toBe("edit");
    expect(access.can("edit")).toBe(true);
    expect(access.can("storage.own")).toBe(true);
    expect(access.can("notifications.send")).toBe(false);
  });

  it("grants nothing beyond view before access has loaded", () => {
    const { access } = setup(null);

    expect(access.level).toBe("view");
    expect(access.can("edit")).toBe(false);
    expect(access.can("storage.own")).toBe(false);
  });

  it("reads live and notifies on change", () => {
    const { access, change } = setup(snapshot("edit"));
    const callback = jest.fn();
    access.subscribe(callback);

    change(snapshot("view"));

    expect(callback).toHaveBeenCalled();
    expect(access.level).toBe("view");
    expect(access.can("edit")).toBe(false);
  });

  it("files an access request with identity-service via the BFF", async () => {
    const { access, request } = setup(snapshot());

    await access.requestAccess("edit");

    expect(request).toHaveBeenCalledWith("/identity/grant-requests", {
      method: "POST",
      body: { hid: "h1", appId: "recipes", requestedLevel: "edit" },
    });
  });
});

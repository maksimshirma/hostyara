import { AccessLevel, SdkAccess } from "@hostyara/contracts";
import { apiError, BffClient } from "./bffClient";
import { AccessTracker } from "./accessTracker";

// An app's sdk.access, derived on every read from the tab's access tracker —
// never a snapshot taken at mount (IA 13.9). Until access has loaded the app
// is treated as having no rights.
export function createSdkAccess(tracker: AccessTracker, bff: BffClient, appId: string): SdkAccess {
  const grantOf = () => tracker.getSnapshot()?.grants[appId];

  return {
    get level(): AccessLevel {
      return grantOf() ?? "view";
    },
    can(action) {
      if (action === "edit") {
        return grantOf() === "edit";
      }
      return tracker.getSnapshot()?.permissions[appId]?.includes(action) ?? false;
    },
    subscribe(callback) {
      return tracker.subscribe(callback);
    },
    async requestAccess(level) {
      const hid = tracker.getHid();
      if (!hid) {
        throw apiError("forbidden", 0);
      }
      await bff.request("/identity/grant-requests", {
        method: "POST",
        body: { hid, appId, requestedLevel: level },
      });
    },
  };
}

import { SdkApi } from "@hostyara/contracts";
import { apiError, BffClient } from "./bffClient";

// An app's sdk.api: always its own backend, in the household currently open
// in the shell (read live — a household switch does not remount the app).
// A different `service` is refused here, before any request: otherwise app
// A could spend the user's grant on app B's backend.
export function createSdkApi(bff: BffClient, appId: string, getHid: () => string | null): SdkApi {
  return {
    async request<T>(
      service: string,
      path: string,
      init?: Parameters<SdkApi["request"]>[2],
    ): Promise<T> {
      if (service !== appId) {
        throw apiError("forbidden", 0);
      }
      if (!path.startsWith("/")) {
        throw apiError("bad_request", 0);
      }
      const hid = getHid();
      if (!hid) {
        throw apiError("forbidden", 0);
      }
      return bff.request<T>(
        `/api/h/${encodeURIComponent(hid)}/apps/${encodeURIComponent(appId)}${path}`,
        init,
      );
    },
  };
}

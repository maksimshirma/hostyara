import { runDevHarness } from "@hostyara/dev-harness";
import appModule from "./index";

// T21: standalone dev entry, served at /standalone.html by this app's own
// dev server — no host needed. Same appModule as the Module Federation
// and iframe entries; only the bootstrap (and the sdk it builds) differs.
void runDevHarness(appModule, { appId: "recipes" });

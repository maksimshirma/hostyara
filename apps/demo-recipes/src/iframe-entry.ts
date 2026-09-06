import { connectToHost } from "@hostyara/iframe-embed";
import appModule from "./index";

// Same appModule as the Module Federation path (index.tsx) — mount(el, sdk)
// doesn't know or care which transport built its sdk (T17: one demo app,
// two transports, no app code changes). This file is the iframe-only
// bootstrap that Module Federation doesn't need: something has to call
// connectToHost() before there's an sdk to mount with at all.
async function boot(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) throw new Error("iframe-entry: #root not found");

  // Dev-only: the host's dev server origin. A real deployment would need
  // this configured per-environment, same as remoteEntry's dev-only
  // publicPath in rspack.config.mjs.
  const sdk = await connectToHost({ contract: "1", hostOrigin: "http://localhost:3000" });
  await appModule.mount(root, sdk);
}

void boot();

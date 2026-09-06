import type { Plugin } from "vite";
import { AppManifest } from "@hostyara/contracts";
import { applyRemoteOverrides, parseRemoteOverrides } from "../registry/applyRemoteOverride";
import { buildContentSecurityPolicy } from "./buildContentSecurityPolicy";
import registryData from "../registry/registry.json";

// T24: same policy shape for both `yarn dev` and `yarn preview` — a real
// deployment needs the identical header set at whatever edge/proxy layer
// actually serves the built dist/, since a static SPA build has no server
// of its own to attach headers to (same gap noted in T23 for the SRI hash
// this policy has no way to enforce either).
//
// Dev's script-src needs 'unsafe-inline' + 'unsafe-eval' on top of the
// registry-derived policy: @vitejs/plugin-react injects an inline
// <script type="module"> "preamble" into index.html to set up React Fast
// Refresh's globals before any component module runs, and Vite's own HMR
// client relies on eval internally. Neither exists in a production
// build, so the strict, registry-only policy below is what preview (and
// a real deployment) actually gets.
function policyForRequestUrl(url: string | undefined, devMode: boolean): string {
  const search = url?.includes("?") ? url.slice(url.indexOf("?")) : "";
  const overrides = parseRemoteOverrides(search);
  const manifests = applyRemoteOverrides(registryData as AppManifest[], overrides);
  const policy = buildContentSecurityPolicy(manifests);
  if (!devMode) return policy;

  return policy.replace(/script-src ([^;]*)/, "script-src 'unsafe-inline' 'unsafe-eval' $1");
}

export function cspVitePlugin(): Plugin {
  return {
    name: "hostyara-csp-header",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Content-Security-Policy", policyForRequestUrl(req.url, true));
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Content-Security-Policy", policyForRequestUrl(req.url, false));
        next();
      });
    },
  };
}

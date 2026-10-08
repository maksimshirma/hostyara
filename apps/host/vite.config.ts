import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cspVitePlugin } from "./src/csp/cspVitePlugin";

// The host and the BFF share one origin (token-storage.md): in dev and
// preview the host's server forwards the BFF's paths to it.
const BFF_URL = process.env.BFF_URL ?? "http://localhost:4000";
const bffProxy = Object.fromEntries(
  ["/auth", "/identity", "/api"].map((prefix) => [prefix, { target: BFF_URL }]),
);

export default defineConfig({
  plugins: [react(), cspVitePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: bffProxy,
  },
  preview: {
    proxy: bffProxy,
  },
  build: {
    // Generated for internal error-reporting tooling to fetch by
    // convention, but "hidden" means no sourceMappingURL comment ships in
    // the built JS — a visitor's devtools won't auto-load it (T23:
    // "sourcemaps генерируются и не публикуются").
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Vendor code (React, Module Federation's runtime) changes far
        // less often than this app's own ~15 files of orchestration code
        // — splitting them lets a browser cache the vendor chunk across
        // deploys that only touch host code.
        manualChunks: {
          vendor: ["react", "react-dom", "@module-federation/runtime"],
        },
      },
    },
  },
});

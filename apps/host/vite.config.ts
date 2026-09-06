import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cspVitePlugin } from "./src/csp/cspVitePlugin";

export default defineConfig({
  plugins: [react(), cspVitePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
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

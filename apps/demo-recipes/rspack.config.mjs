import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import { rspack } from "@rspack/core";

const isProduction = process.env.NODE_ENV === "production";

export default {
  mode: isProduction ? "production" : "development",
  // iframeEmbed (T17) and devHarness (T21): static entries alongside the
  // Module Federation container below, all three booting the exact same
  // appModule (src/index.tsx) through a different bootstrap.
  entry: {
    iframeEmbed: "./src/iframe-entry.ts",
    devHarness: "./src/dev-harness-entry.ts",
  },
  output: {
    publicPath: "http://localhost:5174/",
    uniqueName: "recipes",
  },
  devServer: {
    port: 5174,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript", tsx: true },
              transform: { react: { runtime: "automatic" } },
            },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.module\.css$/,
        type: "css/module",
        parser: { namedExports: false },
      },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "recipes",
      filename: "remoteEntry.js",
      exposes: {
        "./app": "./src/index.tsx",
      },
      dts: false,
    }),
    new rspack.HtmlRspackPlugin({
      filename: "iframe.html",
      chunks: ["iframeEmbed"],
      templateContent: '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    }),
    // No #root needed here — runDevHarness creates its own host element
    // and shadow root, exactly like the real mount manager does.
    new rspack.HtmlRspackPlugin({
      filename: "standalone.html",
      chunks: ["devHarness"],
      templateContent: "<!DOCTYPE html><html><body></body></html>",
    }),
  ],
};

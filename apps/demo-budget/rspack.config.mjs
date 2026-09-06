import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";

const isProduction = process.env.NODE_ENV === "production";

export default {
  mode: isProduction ? "production" : "development",
  entry: {},
  output: {
    publicPath: "http://localhost:5175/",
    uniqueName: "budget",
    // Dev keeps fixed names — registry.json's dev entries point at a
    // stable URL, and content-hashing would just churn on every save.
    // Production content-hashes everything MF's own runtime resolves
    // internally (the exposed module's chunk, shared deps) — only
    // remoteEntry's own name is a fixed contract the registry has to know
    // about explicitly, see mount.remoteEntry below.
    filename: isProduction ? "[name].[contenthash].js" : "[name].js",
    cssFilename: isProduction ? "[name].[contenthash].css" : "[name].css",
  },
  devServer: {
    port: 5175,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript" },
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
      name: "budget",
      // tech.md: "remoteEntry адресуется по хешу содержимого, версию
      // резолвит реестр" — the one URL the registry hardcodes, so it has
      // to be updated to match after every production build (see the
      // build script for how).
      filename: isProduction ? "remoteEntry.[contenthash].js" : "remoteEntry.js",
      exposes: {
        "./app": "./src/index.ts",
      },
      dts: false,
    }),
  ],
};

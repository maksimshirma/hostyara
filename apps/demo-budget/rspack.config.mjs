import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";

const isProduction = process.env.NODE_ENV === "production";

export default {
  mode: isProduction ? "production" : "development",
  entry: {},
  output: {
    publicPath: "http://localhost:5175/",
    uniqueName: "budget",
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
      filename: "remoteEntry.js",
      exposes: {
        "./app": "./src/index.ts",
      },
      dts: false,
    }),
  ],
};

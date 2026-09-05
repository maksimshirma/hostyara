import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";

const isProduction = process.env.NODE_ENV === "production";

export default {
  mode: isProduction ? "production" : "development",
  entry: {},
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
  ],
};

const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: path.resolve(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "gspclient.js",
    library: "GSPClient",
    libraryTarget: "var"
  },
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};

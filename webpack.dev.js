const path = require("path");

module.exports = {
  entry: path.resolve(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "gspclient.js",
    library: "GSPClient",
    libraryTarget: "var",
  },
  mode: "development",
  devtool: "source-map",
  optimization: {
    minimize: false,
  },
};

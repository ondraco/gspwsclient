const path = require("path");

module.exports = (env) => {
  return [
    {
      target: "web",
      entry: path.resolve(__dirname, "src/index.js"),
      mode: "production",
      optimization: {
        minimize: true,
      },
      output: {
        path: path.resolve(__dirname, "release"),
        filename: "var/gspclient.min.js",
        library: "GSPClient",
        libraryTarget: "var",
      },
    },
  ];
};

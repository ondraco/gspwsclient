const path = require("path");

module.exports = (env) => {
  return [
    // COMMON JS2
    {
      target: "node",
      entry: [path.resolve(__dirname, "src/index.js")],
      mode: "production",
      optimization: {
        minimize: true,
      },
      externals: ['bufferutil', 'utf-8-validate'],
      output: {
        path: path.resolve(__dirname, "release"),
        filename: "commonjs2/gspclient.min.js",
        library: "GSPClient",
        libraryTarget: "commonjs2",
      },
    },
  ];
};

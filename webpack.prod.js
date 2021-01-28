const path = require("path");

module.exports = [
  // ES5 min
  {
    entry: [
      path.resolve(__dirname, "src/customEventPoly.js"),
      path.resolve(__dirname, "src/index.js"),
    ],
    output: {
      path: path.resolve(__dirname, "release"),
      filename: "es5/gspclient.min.js",
      library: "GSPClient",
      libraryTarget: "var",
    },
    mode: "production",
    optimization: {
      minimize: true,
    },
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
  },
  // DEFAULT
  {
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
  // COMMON JS2
  {
    entry: path.resolve(__dirname, "src/index.js"),
    mode: "production",
    optimization: {
      minimize: true,
    },
    output: {
      path: path.resolve(__dirname, "release"),
      filename: "commonjs2/gspclient.min.js",
      library: "GSPClient",
      libraryTarget: "commonjs2",
    },
  },
];

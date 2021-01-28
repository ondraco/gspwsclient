const path = require("path");

module.exports = (env) => {
  return [
    {
      target: "web",
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
  ];
};

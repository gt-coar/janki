// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

const path = require('path');

const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  resolve: {
    fallback: {
      fs: false,
      crypto: false,
    },
  },
  module: {
    rules: [
      {
        test: /.wasm$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[hash].[ext]',
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: `${path.dirname(
            require.resolve('libarchive.js/package.json')
          )}/dist/wasm-gen/*`,
          to: ({ context, absoluteFilename }) => {
            console.warn(context, absoluteFilename);
            return `wasm-gen/${path.basename(absoluteFilename)}`;
          },
        },
      ],
    }),
  ],
};

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

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
};

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Widget } from '@lumino/widgets';

import { ensureSQLite } from './sqlite';
import { FILE_TYPE } from './tokens';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-sqlite3';

/**
 * A widget for rendering sqlite3.
 */
export class SQLite3 extends Widget implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
  }

  /**
   * Render sqlite into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    const SQL = await ensureSQLite();
    console.log(data, SQL);
  }

  private _mimeType: string;
}

/**
 * A mime renderer factory for sqlite data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: FILE_TYPE.mimeTypes,
  createRenderer: (options) => new SQLite3(options),
};

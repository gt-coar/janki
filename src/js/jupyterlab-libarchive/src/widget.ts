// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Widget } from '@lumino/widgets';

import { FILE_TYPES } from './tokens';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-libarchive';

/**
 * A widget for rendering archives.
 */
export class Archive extends Widget implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
  }

  /**
   * Render archive into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    console.log(data);
    return Promise.resolve();
  }

  private _mimeType: string;
}

/**
 * A mime renderer factory for archive data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: FILE_TYPES[0].mimeTypes,
  createRenderer: (options) => new Archive(options),
};

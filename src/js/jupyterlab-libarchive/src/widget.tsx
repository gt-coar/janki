// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.



import { VDomRenderer } from '@jupyterlab/apputils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Panel, PanelLayout } from '@lumino/widgets';
import type { ICompressedFileEntry } from 'libarchive.js';
import * as React from 'react';

import { Model } from './model';
import { FILE_TYPES } from './tokens';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'jp-Archive';

export class ArchiveRenderer extends VDomRenderer<Model> {
  protected render() {
    this.addClass('jp-RenderedHTMLCommon');
    const { members } = this.model;
    return (
      <table>
        <thead>
          <tr>
            <th>path</th>
            <th>size</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(members.entries()).map(([path, member]) =>
            this.renderFile(path, member)
          )}
        </tbody>
      </table>
    );
  }

  protected renderFile = (path: string, member: ICompressedFileEntry) => {
    return (
      <tr key={path}>
        <th>{path}</th>
        <th>{member.file.size}</th>
      </tr>
    );
  };
}

/**
 * A widget for rendering archives.
 */
export class Archive extends Panel implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this._archiveModel = new Model();
    this._renderer = new ArchiveRenderer(this._archiveModel);
    this.addClass(CLASS_NAME);
    (this.layout as PanelLayout).addWidget(this._renderer);
  }

  /**
   * Render archive into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this._archiveModel.data = model.data[this._mimeType] as string;
  }

  private _mimeType: string;
  private _archiveModel: Model;
  private _renderer: ArchiveRenderer;
}

/**
 * A mime renderer factory for archive data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: FILE_TYPES[0].mimeTypes,
  createRenderer: (options) => new Archive(options),
};

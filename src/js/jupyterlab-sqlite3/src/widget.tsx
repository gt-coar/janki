// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Panel, PanelLayout } from '@lumino/widgets';
import * as React from 'react';

import { Model } from './model';
import { FILE_TYPE } from './tokens';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'jp-SQLite3';

export class DBRenderer extends VDomRenderer<Model> {
  protected render() {
    this.addClass('jp-RenderedHTMLCommon');
    const { tables } = this.model;
    return <ul>{Array.from(tables.values()).map(this.renderTable)}</ul>;
  }

  protected renderTable = (table: Model.ITable) => {
    return (
      <li key={table.name}>
        <label>{table.name}</label>
        <table>
          <thead>
            <tr>
              <th>name</th>
              <th>primary key</th>
              <th>type</th>
              <th>cid</th>
              <th>default</th>
              <th>not null</th>
            </tr>
          </thead>
          <tbody>{Array.from(table.columns.values()).map(this.renderColumn)}</tbody>
        </table>
      </li>
    );
  };

  protected renderColumn = (column: Model.IColumn) => {
    return (
      <tr key={column.name}>
        <th>{column.name}</th>
        <th>{column.pk}</th>
        <td>{column.type}</td>
        <td>{column.cid}</td>
        <td>{column.dflt_value}</td>
        <td>{column.notnull}</td>
      </tr>
    );
  };
}

/**
 * A widget for rendering sqlite3.
 */
export class SQLite3 extends Panel implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
    this._dbModel = new Model();
    this._renderer = new DBRenderer(this._dbModel);
    (this.layout as PanelLayout).addWidget(this._renderer);
  }

  /**
   * Render sqlite into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this._dbModel.data = model.data[this._mimeType] as string;
    console.log(this._dbModel);
  }

  private _mimeType: string;
  private _dbModel: Model;
  private _renderer: DBRenderer;
}

/**
 * A mime renderer factory for sqlite data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: FILE_TYPE.mimeTypes,
  createRenderer: (options) => new SQLite3(options),
};

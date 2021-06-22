// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { CommandToolbarButton, MainAreaWidget } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';

import { CommandIds } from './tokens';

/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export class SQLiteQueryButton
  implements DocumentRegistry.IWidgetExtension<MainAreaWidget, DocumentRegistry.IModel>
{
  commands: CommandRegistry;
  private _queryRequested = new Signal<SQLiteQueryButton, any>(this);

  createNew(
    panel: MainAreaWidget,
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDisposable {
    const sqlite = (panel as any).content.layout.widgets[0].renderer.model;
    sqlite.queryRequested.connect((sender: any, args: any) => {
      this._queryRequested.emit({ db: sqlite, ...args });
    });
    const queryBtn = new CommandToolbarButton({
      commands: this.commands,
      id: CommandIds.query,
    });
    const saveBtn = new CommandToolbarButton({
      commands: this.commands,
      id: CommandIds.save,
    });
    panel.toolbar.insertItem(9, 'query', queryBtn);
    panel.toolbar.insertItem(9, 'save', saveBtn);
    return new DisposableDelegate(() => {
      queryBtn.dispose();
      saveBtn.dispose();
    });
  }

  get queryRequested() {
    return this._queryRequested;
  }
}

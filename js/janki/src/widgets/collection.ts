// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel, PanelLayout } from '@lumino/widgets';

import { DEBUG } from '../constants';
import { CollectionModel } from '../models/collection';
import { ICardCollection, ICardManager, CSS } from '../tokens';

import { CollectionBar } from './bar';
import { Cards } from './cards';

export class CardCollection extends Panel {
  private _ready = new PromiseDelegate<void>();

  /**
   * The card collection widget's context.
   */
  readonly context: DocumentRegistry.Context;

  /**
   * The card collection widget's context.
   */
  readonly manager: ICardManager;

  /**
   * The collection model representing the entire SQLite database
   */
  readonly model: CollectionModel;

  /**
   * A promise that resolves when the collection viewer is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  constructor(options: ICardCollection.IOptions) {
    super();
    const { context, manager } = options;
    this.context = context;
    this.manager = manager;
    [CSS.collection, CSS.LAB.html, ...(DEBUG ? [CSS.debug] : [])].forEach((cls) =>
      this.addClass(cls)
    );
    const model = (this.model = new CollectionModel());
    const layout = this.layout as PanelLayout;

    const bar = new CollectionBar(model);
    const cards = new Cards(model);

    layout.addWidget(bar);
    layout.addWidget(cards);

    context.pathChanged.connect(this._onPathChanged, this);
    model.stateChanged.connect(this._onModelStateChanged, this);

    void context.ready.then(async () => {
      if (this.isDisposed) {
        return;
      }
      context.model.contentChanged.connect(this.update, this);
      context.fileChanged.connect(this.update, this);
    });

    // initialize
    this._onPathChanged().catch(console.warn);
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.context.model.contentChanged.disconnect(this.update, this);
    this.context.fileChanged.disconnect(this.update, this);
    this.model.stateChanged.disconnect(this._onModelStateChanged, this);
    this.model.dispose();
    super.dispose();
  }

  private _onModelStateChanged() {
    if (this.model.collection) {
      this._ready.resolve(void 0);
      this.model.stateChanged.disconnect(this._onModelStateChanged, this);
    }
  }

  /**
   * Handle a change to the title.
   */
  private async _onPathChanged(): Promise<void> {
    this.title.label = PathExt.basename(this.context.localPath);
    await this.context.ready;
    this.model.path = this.context.path;
    this.model.data = this.context.model.toString();
    // this.model.collection = await this.manager.collection(this.context.path);
  }
}

export namespace CardCollection {
  export interface IOptions {
    context: DocumentRegistry.Context;
  }
}

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel, PanelLayout } from '@lumino/widgets';
import * as React from 'react';

import * as SCHEMA from './_schema';
import { ICardCollection, ICardManager, CSS } from './tokens';
import { Model } from './model';

export class CollectionBar extends VDomRenderer<Model> {
  constructor(model: Model) {
    super(model);
    this.addClass(CSS.bar);
  }

  protected render() {
    const { collection } = this.model;
    const path = collection?.path || 'Loading...';
    return <h1>{path}</h1>;
  }
}

export class CardGroups extends VDomRenderer<Model> {
  constructor(model: Model) {
    super(model);
    this.addClass(CSS.cards);
  }
  protected render() {
    const cards = this.model?.collection?.cards || {};
    return <ul>{Object.values(cards).map(this.renderCard)}</ul>;
  }

  renderCard = (card: SCHEMA.Card) => {
    const note = this.model.collection.notes[`${card.nid}`];

    if (!card || !note) {
      return <></>;
    }

    return (
      <li className={[CSS.card, CSS.LAB.card].join(' ')} key={`${card.id}`}>
        {this.renderFields(note, card)}
      </li>
    );
  };

  renderFields = (note: SCHEMA.Note, card: SCHEMA.Card) => {
    const flds = note.flds.split('\u001f');
    return <ul>{flds.map(this.renderField)}</ul>;
  };

  renderField = (field: string) => {
    return <div className={[CSS.field].join(' ')}>{field}</div>;
  };
}

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

  readonly model: Model;

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
    [CSS.collection, CSS.LAB.html].forEach((cls) => this.addClass(cls));
    const model = (this.model = new Model());
    const layout = this.layout as PanelLayout;

    const bar = new CollectionBar(model);
    const cards = new CardGroups(model);

    layout.addWidget(bar);
    layout.addWidget(cards);

    context.pathChanged.connect(this._onPathChanged, this);
    model.stateChanged.connect(() => {
      if (model.collection) {
        this._ready.resolve(void 0);
      }
    });

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

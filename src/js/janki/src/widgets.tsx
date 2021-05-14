// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel, PanelLayout } from '@lumino/widgets';
import * as React from 'react';

import * as SCHEMA from './_schema';
import { ICardCollection, ICardManager, CSS } from './tokens';

export type TGroupedCards = Map<string, SCHEMA.Card[]>;
export type TGroupedNotes = Map<number, SCHEMA.Note[]>;

export class CollectionModel extends VDomModel {
  private _collection: SCHEMA.Collection;
  private _groupCardsBy: string[] = ['cdeck'];

  set collection(collection: SCHEMA.Collection) {
    this._collection = collection;
    this.stateChanged.emit(void 0);
  }

  get collection(): SCHEMA.Collection {
    return this._collection;
  }

  get groupCardsBy(): string[] {
    return this._groupCardsBy || [];
  }

  set groupCardsBy(groupCardsBy: string[]) {
    this._groupCardsBy = groupCardsBy;
    this.stateChanged.emit(void 0);
  }

  get groupedCards(): TGroupedCards {
    const groups: TGroupedCards = new Map();
    for (const card of this._collection?.cards || []) {
      const key = `${this._groupCardsBy.map((key) => (card as any)[key])}`;
      groups.set(key, [...(groups.get(key) || []), card]);
    }
    return groups;
  }

  // get groupedNotes(): TGroupedNotes {
  //   const groups: TGroupedNotes = new Map();
  // }
}

export class CollectionBar extends VDomRenderer<CollectionModel> {
  constructor(model: CollectionModel) {
    super(model);
    this.addClass(CSS.bar);
  }

  protected render() {
    const { collection } = this.model;
    const path = collection?.path || 'Loading...';
    return <h1>{path}</h1>;
  }
}

/**
 *
 */
export class CardGroups extends VDomRenderer<CollectionModel> {
  constructor(model: CollectionModel) {
    super(model);
    this.addClass(CSS.cards);
  }
  protected render() {
    const { groupedCards } = this.model;
    const groupNodes = [] as JSX.Element[];
    for (const [key, cards] of groupedCards.entries()) {
      groupNodes.push(this.renderCardGroup(key, cards));
    }
    return <ul>{groupNodes}</ul>;
  }

  renderCard = (card: SCHEMA.Card) => {
    return (
      <li className={[CSS.card, CSS.LAB.card].join(' ')} key={card.nid}>
        {card.nid}
      </li>
    );
  };

  renderCardGroup = (key: string, cards: SCHEMA.Card[]) => {
    const cardNodes = cards.map(this.renderCard);
    return (
      <li key={key}>
        {this.renderGroupLabel(key)}
        <ul>{cardNodes}</ul>
      </li>
    );
  };

  renderGroupLabel = (key: string) => {
    return <label>{key}</label>;
  };

  // renderNotes = (card: SCHEMA.card) {

  // }
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

  readonly model: CollectionModel;

  /**
   * A promise that resolves when the image viewer is ready.
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
    const model = (this.model = new CollectionModel());
    const layout = this.layout as PanelLayout;

    const bar = new CollectionBar(model);
    const cards = new CardGroups(model);

    layout.addWidget(bar);
    layout.addWidget(cards);

    this._onPathChanged().catch(console.warn);
    context.pathChanged.connect(this._onPathChanged, this);

    void context.ready.then(async () => {
      if (this.isDisposed) {
        return;
      }
      context.model.contentChanged.connect(this.update, this);
      context.fileChanged.connect(this.update, this);
      this._ready.resolve(void 0);
    });
  }

  /**
   * Handle a change to the title.
   */
  private async _onPathChanged(): Promise<void> {
    this.title.label = PathExt.basename(this.context.localPath);
    this.model.collection = await this.manager.collection(this.context.path);
  }
}

export namespace CardCollection {
  export interface IOptions {
    context: DocumentRegistry.Context;
  }
}

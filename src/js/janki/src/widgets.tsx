// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Model as ArchiveModel } from '@gt-coar/jupyterlab-libarchive';
import { Model as DBModel } from '@gt-coar/jupyterlab-sqlite3';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel, PanelLayout } from '@lumino/widgets';
import * as React from 'react';

import * as SCHEMA from './_schema';
import { DEBUG } from './constants';
import { ICardCollection, ICardManager, CSS } from './tokens';

export const Q_CARDS = `SELECT * from cards;`;
export const Q_COLL_META = `SELECT * from col;`;
export const Q_NOTES = `SELECT * from notes;`;
export const Q_REVS = `SELECT * from revlog;`;

export class CollectionModel extends VDomModel {
  private _collection: SCHEMA.Collection;
  private _data: string;
  private _path: string;
  private _archiveModel: ArchiveModel | null;
  private _dbModel: DBModel | null;

  set collection(collection: SCHEMA.Collection) {
    this._collection = collection;
    this.stateChanged.emit(void 0);
  }

  get collection(): SCHEMA.Collection {
    return this._collection;
  }

  get path() {
    return this._path;
  }

  set path(path: string) {
    this._path = path;
    this.stateChanged.emit(void 0);
  }

  get isApkg() {
    return (this._path || '').match(/\.apkg$/);
  }

  get data() {
    return this._data;
  }

  set data(data) {
    this._data = data;
    this.updateCollection().catch(console.error);
  }

  protected async updateCollection(): Promise<void> {
    this._dbModel = new DBModel();
    this._dbModel.stateChanged.connect(this.dbModelChanged, this);

    if (this.isApkg) {
      this._archiveModel = new ArchiveModel();
      this._archiveModel.stateChanged.connect(this.archiveModelChanged, this);
      this._archiveModel.data = this._data;
    } else {
      this._dbModel.data = this._data;
    }
  }

  protected async dbModelChanged() {
    if (!this._dbModel) {
      return;
    }
    DEBUG && console.info('db tables', this._dbModel.tables);
    this.collection = {
      cards: this.getCards(),
      col: this.getCollectionMetadata(),
      notes: this.getNotes(),
      path: this.path,
      revlog: this.getRevs(),
    };
    this.stateChanged.emit(void 0);
  }

  protected async archiveModelChanged(): Promise<void> {
    if (!(this._archiveModel && this._dbModel)) {
      return;
    }

    DEBUG && console.info('archive members', this._archiveModel.members);
    for (const [path, member] of this._archiveModel.members.entries()) {
      if (path.match(/\.anki2$/)) {
        const file = await member.file.extract();
        const buf = await file.arrayBuffer();
        this._dbModel.array = new Uint8Array(buf);
        break;
      }
    }
    this.stateChanged.emit(void 0);
  }

  protected getCards(): { [k: string]: SCHEMA.Card } {
    let cards: { [k: string]: SCHEMA.Card } = {};
    if (this._dbModel) {
      for (const card of this._dbModel.query<SCHEMA.Card>(Q_CARDS)) {
        cards[card.id] = card;
      }
    }
    return cards;
  }

  protected getCollectionMetadata(): { [k: string]: SCHEMA.CollectionMetadata } {
    let cols: { [k: string]: SCHEMA.CollectionMetadata } = {};
    if (this._dbModel) {
      for (const col of this._dbModel.query<SCHEMA.CollectionMetadata>(Q_COLL_META)) {
        cols[col.id] = col;
      }
    }
    return cols;
  }

  protected getNotes(): { [k: string]: SCHEMA.Note } {
    let notes: { [k: string]: SCHEMA.Note } = {};
    if (this._dbModel) {
      for (const note of this._dbModel.query<SCHEMA.Note>(Q_NOTES)) {
        notes[note.id] = note;
      }
    }
    return notes;
  }

  protected getRevs(): { [k: string]: SCHEMA.Rev } {
    let revs: { [k: string]: SCHEMA.Rev } = {};
    if (this._dbModel) {
      for (const rev of this._dbModel.query<SCHEMA.Rev>(Q_REVS)) {
        revs[rev.id] = rev;
      }
    }
    return revs;
  }
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

export class CardGroups extends VDomRenderer<CollectionModel> {
  constructor(model: CollectionModel) {
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
    [CSS.collection, CSS.LAB.html].forEach((cls) => this.addClass(cls));
    const model = (this.model = new CollectionModel());
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

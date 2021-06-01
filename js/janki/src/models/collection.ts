// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { Model as ArchiveModel } from '@gt-coar/jupyterlab-libarchive';
import { Model as DBModel } from '@gt-coar/jupyterlab-sqlite3';
import { VDomModel } from '@jupyterlab/apputils';

import * as SCHEMA from '../_schema';
import { DEBUG, JSON_FIELDS, APKG_MEDIA_JSON, APKG_COLLECTION } from '../constants';
import {
  ICollectionModel,
  ICardManager,
  ICardsQuery,
  ICardsRequest,
  INewCardRequest,
  IMediaFuture,
} from '../tokens';

export const Q_CARDS = `SELECT * from cards;`;
export const Q_COLL_META = `SELECT * from col;`;
export const Q_NOTES = `SELECT * from notes;`;
export const Q_REVS = `SELECT * from revlog;`;

export class CollectionModel extends VDomModel implements ICollectionModel {
  private _collection: SCHEMA.Collection;
  private _data: string;
  private _path: string;
  private _archiveModel: ArchiveModel | null;
  private _dbModel: DBModel | null;
  private _media: Record<string, string>;
  private _futureMedia: Record<string, IMediaFuture>;
  private _manager: ICardManager;

  set manager(manager: ICardManager) {
    this._manager = manager;
    this.stateChanged.emit(void 0);
  }

  get manager() {
    return this._manager;
  }

  set collection(collection: SCHEMA.Collection) {
    this._collection = collection;
    this.stateChanged.emit(void 0);
  }

  get collection(): SCHEMA.Collection {
    return this._collection;
  }

  get media(): Record<string, string> {
    return this._media || {};
  }

  get futureMedia(): Record<string, IMediaFuture> {
    return this._futureMedia || {};
  }

  get path() {
    return this._path;
  }

  set path(path: string) {
    this._path = path;
    this.stateChanged.emit(void 0);
  }

  requestDecks(query: ICardsQuery): void {
    const request: ICardsRequest = { model: this, query };
    this.manager.requestCards(request);
  }

  requestNewCard(
    card: Partial<SCHEMA.Card>,
    note: Partial<SCHEMA.Note> = {},
    template: Partial<SCHEMA.Template> = {}
  ) {
    const request: INewCardRequest = {
      collection: this,
      card,
      note,
      template,
    };
    this.manager.requestNewCard(request);
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
    let file: File;
    let buf: ArrayBuffer;
    let mediaMap: Record<string, string> = {};
    for (const [path, member] of this._archiveModel.members.entries()) {
      switch (path) {
        case APKG_COLLECTION:
          file = await member.file.extract();
          buf = await file.arrayBuffer();
          this._dbModel.array = new Uint8Array(buf);
          break;
        case APKG_MEDIA_JSON:
          file = await member.file.extract();
          mediaMap = JSON.parse(await file.text());
          break;
        default:
          break;
      }
    }

    this._media = {};
    this._futureMedia = {};

    if (Object.keys(mediaMap).length) {
      // iterate again for media
      for (const [path, member] of this._archiveModel.members.entries()) {
        const mediaPath = mediaMap[path];
        if (mediaPath) {
          this._futureMedia[mediaPath] = this.scheduleOneMedia(mediaPath, member);
        }
      }
    }
    this.stateChanged.emit(void 0);
  }

  scheduleOneMedia(mediaPath: string, member: ArchiveModel.IEntry): IMediaFuture {
    const task = async () => {
      DEBUG && console.log('future', mediaPath);
      const blobUrl = URL.createObjectURL(await member.file.extract());
      this._media[mediaPath] = blobUrl;
      DEBUG && console.log('......', mediaPath);
    };

    return task;
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
        cols[col.id] = this.blobToJSON('col', col) as SCHEMA.CollectionMetadata;
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

  /**
   * Transform blob fields
   */
  protected blobToJSON(table: string, row: Record<string, any>): Record<string, any> {
    for (const column of JSON_FIELDS[table] || []) {
      row[column] = row[column] ? JSON.parse(row[column]) : null;
    }
    return row;
  }
}

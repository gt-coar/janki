// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { Model as ArchiveModel } from '@gt-coar/jupyterlab-libarchive';
import { Model as DBModel } from '@gt-coar/jupyterlab-sqlite3';
import { VDomModel } from '@jupyterlab/apputils';
import { PromiseDelegate } from '@lumino/coreutils';

import * as SCHEMA from '../_schema';
import { DEBUG, JSON_FIELDS, APKG_MEDIA_JSON, APKG_COLLECTION } from '../constants';
import {
  ICollectionModel,
  ICardManager,
  ICardsQuery,
  ICardsRequest,
  INewCardRequest,
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
  private _futureMedia: Record<string, Promise<void> | null>;
  private _manager: ICardManager;

  /** A mapping of the full file names to integer short paths in the archive */
  private _mediaMap: Record<string, string>;

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

  get futureMedia(): string[] {
    return [...Object.keys(this._futureMedia || {})];
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
      path: this.path,
      // db models
      cards: await this.getCards(),
      col: await this.getCollectionMetadata(),
      notes: await this.getNotes(),
      revlog: await this.getRevs(),
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

    this._mediaMap = {};

    for (const [path, member] of this._archiveModel.members.entries()) {
      switch (path) {
        case APKG_COLLECTION:
          file = await member.file.extract();
          buf = await file.arrayBuffer();
          this._dbModel.array = new Uint8Array(buf);
          break;
        case APKG_MEDIA_JSON:
          this._mediaMap = await this.invertMediaMap(
            await (await member.file.extract()).text()
          );
          break;
        default:
          break;
      }
    }

    this._media = {};
    this._futureMedia = {};

    for (const mediaPath of Object.keys(this._mediaMap)) {
      this._futureMedia[mediaPath] = null;
    }

    this.stateChanged.emit(void 0);
  }

  async invertMediaMap(raw: string): Promise<Record<string, string>> {
    const parsed = JSON.parse(raw) as Record<string, string>;
    let inverted = {} as Record<string, string>;
    for (let [inArchive, realName] of Object.entries(parsed)) {
      inverted[realName] = inArchive;
    }

    return inverted;
  }

  private _mediaQueue: string[] = [];
  private _mediaLock: PromiseDelegate<void>;

  async scheduleOneMedia(mediaPath: string): Promise<void> {
    const inArchive = this._mediaMap[mediaPath];
    if (this._media[mediaPath]) {
      return;
    }

    this._mediaQueue.push(mediaPath);

    while (this._mediaQueue[0] !== mediaPath) {
      await this._mediaLock.promise;
    }

    this._mediaLock = new PromiseDelegate();

    const { file } = this._archiveModel?.members.get(inArchive) || {};

    if (file) {
      const extracted = await file.extract();
      const blobUrl = URL.createObjectURL(extracted);
      this._media[mediaPath] = blobUrl;
    }

    this._mediaQueue.shift();
    this._mediaLock.resolve();
  }

  fetchMediaFuture(mediaPath: string): Promise<void> | null {
    if (!this._futureMedia[mediaPath]) {
      this._futureMedia[mediaPath] = this.scheduleOneMedia(mediaPath);
    }
    return this._futureMedia[mediaPath] || null;
  }

  protected async getCards(): Promise<{ [k: string]: SCHEMA.Card }> {
    let cards: { [k: string]: SCHEMA.Card } = {};
    if (this._dbModel) {
      const rows = await this._dbModel.query<SCHEMA.Card>(Q_CARDS);
      for (const card of rows) {
        cards[card.id] = card;
      }
    }
    return cards;
  }

  protected async getCollectionMetadata(): Promise<{
    [k: string]: SCHEMA.CollectionMetadata;
  }> {
    let cols: { [k: string]: SCHEMA.CollectionMetadata } = {};
    if (this._dbModel) {
      const rows = await this._dbModel.query<SCHEMA.CollectionMetadata>(Q_COLL_META);
      for (const col of rows) {
        cols[col.id] = this.blobToJSON('col', col) as SCHEMA.CollectionMetadata;
      }
    }
    return cols;
  }

  protected async getNotes(): Promise<{ [k: string]: SCHEMA.Note }> {
    let notes: { [k: string]: SCHEMA.Note } = {};
    if (this._dbModel) {
      const rows = await this._dbModel.query<SCHEMA.Note>(Q_NOTES);
      for (const note of rows) {
        notes[note.id] = note;
      }
    }
    return notes;
  }

  protected async getRevs(): Promise<{ [k: string]: SCHEMA.Rev }> {
    let revs: { [k: string]: SCHEMA.Rev } = {};
    if (this._dbModel) {
      const rows = await this._dbModel.query<SCHEMA.Rev>(Q_REVS);
      for (const rev of rows) {
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

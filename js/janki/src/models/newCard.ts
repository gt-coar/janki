// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';

import * as SCHEMA from '../_schema';
import { FIELD_DELIMITER } from '../constants';
import { ICollectionModel, INewCardModel } from '../tokens';

import { CardModel } from './card';

export class NewCardModel extends VDomModel implements INewCardModel {
  private _collection: ICollectionModel;
  private _card: Partial<SCHEMA.Card>;
  private _template: Partial<SCHEMA.Template>;
  private _note: Partial<SCHEMA.Note>;
  private _modelId: number;
  private _fields = new Map<number, string>();

  constructor(options: NewCardModel.IOptions) {
    super();
    this._collection = options.collection;
    this._card = options.card;
    this._template = options.template;
    this._note = options.note;
    this.initDefaults();
  }

  initDefaults() {
    this._modelId = this._note?.mid || Object.values(this.colOne.models || {})[0].id;
    this._card.ord = this._card.ord == null ? 0 : this._card.ord;
  }

  get card() {
    return this._card;
  }

  set card(card: Partial<SCHEMA.Card>) {
    this._card = card;
    this.stateChanged.emit(void 0);
  }

  get collection() {
    return this._collection;
  }

  get colOne() {
    const { collection } = this._collection;
    const { col } = collection;
    return col['1'] || {};
  }

  get modelId() {
    return this._modelId;
  }

  set modelId(modelId) {
    this._modelId = modelId;
    this.stateChanged.emit(void 0);
  }

  get model() {
    return (this.colOne?.models || {})[this._modelId];
  }

  get models() {
    return [...Object.values(this.colOne.models || {})];
  }

  get decks() {
    return [...Object.values(this.colOne.decks || {})];
  }

  get templates() {
    return [];
  }

  get note() {
    let len = (this.model?.flds || []).length;
    let flds: string[] = [];
    let ord = 0;
    while (ord < len) {
      flds.push(this._fields.get(ord) || '');
      ord++;
    }
    return {
      mid: this._modelId,
      flds: flds.join(FIELD_DELIMITER),
      ...(this._note || {}),
    };
  }

  get template() {
    return this._template;
  }

  setField(ord: number, value: string) {
    const oldValue = this._fields.get(ord);
    if (oldValue != value) {
      this._fields.set(ord, value);
      this.stateChanged.emit(void 0);
    }
  }

  getField(ord: number) {
    return this._fields.get(ord) || '';
  }

  createEditor(options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this._collection.manager.editorServices.factoryService.newInlineEditor(
      options
    );
  }
}

export class FakeCardModel extends CardModel {
  private _newCardModel: INewCardModel;

  constructor(newCardModel: INewCardModel) {
    super(-1, newCardModel.collection);
    this._newCardModel = newCardModel;
    this._newCardModel.stateChanged.connect(() => this.stateChanged.emit(void 0));
  }

  get newCardModel() {
    return this._newCardModel;
  }
}

export namespace NewCardModel {
  export interface IOptions {
    collection: ICollectionModel;
    card: Partial<SCHEMA.Card>;
    note: Partial<SCHEMA.Note>;
    template: Partial<SCHEMA.Template>;
  }
}

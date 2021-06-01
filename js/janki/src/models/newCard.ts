// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';

import * as SCHEMA from '../_schema';
import { ICollectionModel, INewCardModel } from '../tokens';

export class NewCardModel extends VDomModel implements INewCardModel {
  private _collection: ICollectionModel;
  private _card: Partial<SCHEMA.Card>;

  constructor(options: NewCardModel.IOptions) {
    super();
    this._collection = options.collection;
    this._card = options.card;
  }

  get card() {
    return this._card;
  }

  get collection() {
    return this._collection;
  }
}

export namespace NewCardModel {
  export interface IOptions {
    collection: ICollectionModel;
    card: Partial<SCHEMA.Card>;
  }
}

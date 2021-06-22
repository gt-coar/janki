// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';

import { ICollectionModel, ICardModel } from '../tokens';

export class CardModel extends VDomModel implements ICardModel {
  private _cardId: number;
  private _collection: ICollectionModel;

  constructor(cardId: number, collection: ICollectionModel) {
    super();
    this._cardId = cardId;
    this._collection = collection;
  }

  get cardId() {
    return this._cardId;
  }

  get collection() {
    return this._collection;
  }

  getMedia(path: string): string {
    let readyPath = this._collection.media[path];

    if (readyPath) {
      return readyPath;
    }

    if (this._collection.futureMedia.indexOf(path) !== -1) {
      const promise = this._collection.fetchMediaFuture(path);

      if (promise) {
        promise.then(() => this.stateChanged.emit(void 0)).catch(console.warn);
      }
    }

    return '';
  }
}

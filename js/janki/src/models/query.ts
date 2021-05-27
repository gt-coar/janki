// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';

import { ICardsQuery } from '../tokens';

export class CardsQueryModel extends VDomModel implements ICardsQuery {
  private _deckIds: number[] = [];

  constructor(query: ICardsQuery) {
    super();
    this._deckIds = query.deckIds;
  }

  set deckIds(deckIds) {
    this._deckIds = deckIds;
    this.stateChanged.emit(void 0);
  }

  get deckIds() {
    return this._deckIds;
  }
}

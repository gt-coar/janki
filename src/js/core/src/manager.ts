// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { ICardManager } from './tokens';

import { PromiseDelegate } from '@lumino/coreutils';

export class CardManager implements ICardManager {
  private _ready = new PromiseDelegate<void>();

  constructor() {
    this._ready.resolve();
  }

  get ready() {
    return this._ready.promise;
  }
}

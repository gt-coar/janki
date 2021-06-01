// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IEditorServices } from '@jupyterlab/codeeditor';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

import * as SCHEMA from './_schema';
import { API_NS } from './constants';
import { ICardManager, ICardsRequest, INewCardRequest } from './tokens';

export class CardManager implements ICardManager {
  private _ready = new PromiseDelegate<void>();
  private _cardsRequested = new Signal<CardManager, ICardsRequest>(this);
  private _newCardRequested = new Signal<CardManager, INewCardRequest>(this);
  private _editorServices: IEditorServices;

  constructor(options: CardManager.IOptions) {
    this._editorServices = options.editorServices;
    this._ready.resolve();
  }

  get ready() {
    return this._ready.promise;
  }

  get editorServices() {
    return this._editorServices;
  }

  get cardsRequested(): ISignal<ICardManager, ICardsRequest> {
    return this._cardsRequested;
  }

  requestCards(request: ICardsRequest): void {
    this._cardsRequested.emit(request);
  }

  get newCardRequested(): ISignal<ICardManager, INewCardRequest> {
    return this._newCardRequested;
  }

  requestNewCard(request: INewCardRequest) {
    this._newCardRequested.emit(request);
  }

  async collection(...path: string[]): Promise<SCHEMA.Collection> {
    return await this._fetch<SCHEMA.Collection>('collection', ...path);
  }

  protected async _fetch<T>(...path: string[]): Promise<T> {
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(settings.baseUrl, ...API_NS, ...path);

    let response: Response;

    try {
      response = await ServerConnection.makeRequest(requestUrl, {}, settings);
    } catch (error) {
      throw new ServerConnection.NetworkError(error);
    }

    let data: any = await response.text();

    if (data.length > 0) {
      try {
        data = JSON.parse(data);
      } catch (error) {
        console.warn('Not a JSON response body.', response);
      }
    }

    if (!response.ok) {
      throw new ServerConnection.ResponseError(response, data.message || data);
    }

    return data as T;
  }
}

export namespace CardManager {
  export interface IOptions {
    editorServices: IEditorServices;
  }
}

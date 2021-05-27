// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { VDomRenderer } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';

import * as PACKAGE_ from '../package.json';

import * as SCHEMA from './_schema';

export const PACKAGE = PACKAGE_;
export const NS = PACKAGE['name'];
export const PLUGIN_ID = `${NS}:plugin`;

export const ICardManager = new Token<ICardManager>(PLUGIN_ID);

export interface ICardManager {
  ready: Promise<void>;
  collection(...path: string[]): Promise<SCHEMA.Collection>;
  requestCards(request: ICardsRequest): void;
  cardsRequested: ISignal<ICardManager, ICardsRequest>;
}

export const CSS = {
  collection: 'jp-JankiCollection',
  card: 'jp-JankiCard',
  cards: 'jp-JankiCards',
  bar: 'jp-JankiBar',
  field: 'jp-JankiField',
  model: 'jp-JankiModel',
  decks: 'jp-JankiDecks',
  template: 'jp-JankiTemplate',
  debug: 'jp-JANKI-DEBUG',
  front: 'jk-mod-front',
  back: 'jk-mod-back',
  LAB: {
    html: 'jp-RenderedHTMLCommon',
    card: 'jp-LauncherCard',
    styled: 'jp-mod-styled',
    accept: 'jp-mod-accept',
  },
};

/**
 * The list of file types for card collections.
 */
export const FILE_TYPES = ['anki2', 'apkg'];

/**
 * The name of the factory that creates card collections.
 */
export const FACTORY = 'Card Collection';

export namespace ICardCollection {
  export interface IOptions {
    manager: ICardManager;
    context: DocumentRegistry.Context;
  }
}

export interface ICollectionModel extends VDomRenderer.IModel {
  manager: ICardManager;
  requestDecks(query: ICardsQuery): void;
  collection: SCHEMA.Collection;
  media: Record<string, string>;
}

export interface ICardsQuery {
  deckIds: number[];
}

export interface ICardsRequest {
  model: ICollectionModel;
  query: ICardsQuery;
}

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { VDomRenderer } from '@jupyterlab/apputils';
import { IEditorServices, CodeEditor } from '@jupyterlab/codeeditor';
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
  requestNewCard(request: INewCardRequest): void;
  cardsRequested: ISignal<ICardManager, ICardsRequest>;
  newCardRequested: ISignal<ICardManager, INewCardRequest>;
  editorServices: IEditorServices;
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
  meta: 'jp-JankiMeta',
  debug: 'jp-JANKI-DEBUG',
  front: 'jk-mod-front',
  back: 'jk-mod-back',
  newCard: 'jp-JankiNewCard',
  newCardTemplate: 'jp-JankiNewCardTemplate',
  newCardPreview: 'jp-JankiNewCardPreview',
  picker: 'jp-JankiPicker',
  fieldEditor: 'jp-JankiFieldEditor',
  LAB: {
    html: 'jp-RenderedHTMLCommon',
    card: 'jp-LauncherCard',
    styled: 'jp-mod-styled',
    accept: 'jp-mod-accept',
    select: 'jp-HTMLSelect',
    default: 'jp-DefaultStyle',
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
  futureMedia: Record<string, IMediaFuture>;
}

export interface ICardModel extends VDomRenderer.IModel {
  cardId: number;
  collection: ICollectionModel;
  getMedia(path: string): string;
}

export interface IMediaFuture {
  (): Promise<void>;
}

// requesting cards
export interface ICardsQuery {
  deckIds: number[];
}

export interface ICardsRequest {
  model: ICollectionModel;
  query: ICardsQuery;
}

// making cards
export interface INewCardModel extends VDomRenderer.IModel {
  collection: ICollectionModel;
  card: Partial<SCHEMA.Card>;
  note: Partial<SCHEMA.Note>;
  template: Partial<SCHEMA.Template>;

  modelId: number;
  model: SCHEMA.Model;

  models: SCHEMA.Model[];
  templates: SCHEMA.Template[];
  decks: SCHEMA.Deck[];

  setField(ord: number, value: string): void;
  getField(ord: number): string;

  // gah widgets
  createEditor(options: CodeEditor.IOptions): CodeEditor.IEditor;
}

export interface INewCardRequest {
  collection: ICollectionModel;
  card: Partial<SCHEMA.Card>;
  note: Partial<SCHEMA.Note>;
  template: Partial<SCHEMA.Template>;
}

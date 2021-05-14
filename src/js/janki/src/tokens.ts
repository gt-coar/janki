// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Token } from '@lumino/coreutils';

import * as PACKAGE_ from '../package.json';

import * as SCHEMA from './_schema';

export const PACKAGE = PACKAGE_;
export const NS = PACKAGE['name'];
export const PLUGIN_ID = `${NS}:plugin`;

export const ICardManager = new Token<ICardManager>(PLUGIN_ID);

export interface ICardManager {
  ready: Promise<void>;
  collection(...path: string[]): Promise<SCHEMA.Collection>;
}

export const CSS = {
  collection: 'jp-JankiCollection',
  card: 'jp-JankiCard',
  cards: 'jp-JankiCards',
  bar: 'jp-JankiBar',
  field: 'jp-JankiField',
  LAB: {
    html: 'jp-RenderedHTMLCommon',
    card: 'jp-LauncherCard',
  },
};

/**
 * The list of file types for card collections.
 */
export const FILE_TYPES = ['anki2'];

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

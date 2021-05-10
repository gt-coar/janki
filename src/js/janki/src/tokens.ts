// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { Token } from '@lumino/coreutils';

import * as PACKAGE_ from '../package.json';

export const PACKAGE = PACKAGE_;
export const NS = PACKAGE['name'];
export const PLUGIN_ID = `${NS}:plugin`;

export const ICardManager = new Token<ICardManager>(PLUGIN_ID);

export interface ICardManager {
  ready: Promise<void>;
}

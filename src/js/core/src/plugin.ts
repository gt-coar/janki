// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { JupyterLab, JupyterFrontEndPlugin } from '@jupyterlab/application';

import { PLUGIN_ID, ICardManager } from './tokens';

import { CardManager } from './manager';

/**
 * The editor tracker extension.
 */
const corePlugin: JupyterFrontEndPlugin<ICardManager> = {
  activate: (app: JupyterLab) => {
    const manager = new CardManager();
    return manager;
  },
  id: PLUGIN_ID,
  requires: [],
  optional: [],
  provides: ICardManager,
  autoStart: true,
};

export default [corePlugin];

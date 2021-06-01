// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { Panel, PanelLayout } from '@lumino/widgets';

import { jankiIcon } from '../icons';
import { INewCardModel } from '../tokens';

export class NewCard extends Panel {
  model: INewCardModel;

  constructor(options: NewCard.IOptions) {
    super();
    this.model = options.model;
    this.addClass('jp-Janki-NewCard');
    this.title.label = 'New Card';
    this.title.icon = jankiIcon;
  }

  get panelLayout() {
    return this.layout as PanelLayout;
  }
}

export namespace NewCard {
  export interface IOptions {
    model: INewCardModel;
  }
}

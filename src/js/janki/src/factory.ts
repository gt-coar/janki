// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget,
  DocumentWidget,
} from '@jupyterlab/docregistry';

import { ICardManager } from './tokens';
import { CardCollection } from './widgets';

/**
 * A widget factory for card collections.
 */
export class CardCollectionFactory extends ABCWidgetFactory<
  IDocumentWidget<CardCollection>
> {
  private _manager: ICardManager;
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDocumentWidget<CardCollection> {
    const content = new CardCollection({ context, manager: this._manager });
    const widget = new DocumentWidget({ content, context });
    return widget;
  }

  set manager(manager: ICardManager) {
    this._manager = manager;
  }
}

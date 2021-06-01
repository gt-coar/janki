// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab,
  JupyterFrontEndPlugin,
  ILayoutRestorer,
} from '@jupyterlab/application';
import { WidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IDocumentWidget, DocumentRegistry } from '@jupyterlab/docregistry';

import { CardCollectionFactory } from './factory';
import { jankiIcon, jankiPkgIcon } from './icons';
import { CardManager } from './manager';
import { NewCardModel } from './models/newCard';
import { CardsQueryModel } from './models/query';
import { NS, PLUGIN_ID, ICardManager, FACTORY, FILE_TYPES } from './tokens';
import {
  CardCollection,
  Cards,
  NewCard,
  CardModelPicker,
  DeckPicker,
  TemplatePicker,
} from './widgets';

/**
 * The editor tracker extension.
 */
const corePlugin: JupyterFrontEndPlugin<ICardManager> = {
  activate: (
    app: JupyterLab,
    editorServices: IEditorServices,
    restorer?: ILayoutRestorer
  ) => {
    const manager = new CardManager({ editorServices });

    app.docRegistry.addFileType({
      name: 'anki2',
      displayName: 'Card Collection',
      mimeTypes: ['application/octet-stream'],
      extensions: ['.anki2'],
      icon: jankiIcon,
      fileFormat: 'base64',
    });

    app.docRegistry.addFileType({
      name: 'apkg',
      displayName: 'Card Collection (Archive)',
      mimeTypes: ['application/octet-stream'],
      extensions: ['.apkg'],
      icon: jankiPkgIcon,
      fileFormat: 'base64',
    });

    const factory = new CardCollectionFactory({
      name: FACTORY,
      modelName: 'base64',
      fileTypes: [...FILE_TYPES],
      defaultFor: FILE_TYPES,
      readOnly: true,
    });

    factory.manager = manager;

    function onWidgetCreated(
      sender: any,
      widget: IDocumentWidget<CardCollection, DocumentRegistry.IModel>
    ) {
      // Notify the widget tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => {
        void tracker.save(widget);
      });
      void tracker.add(widget);

      const types = app.docRegistry.getFileTypesForPath(widget.context.path);

      if (types.length > 0) {
        widget.title.icon = types[0].icon!;
        widget.title.iconClass = types[0].iconClass ?? '';
        widget.title.iconLabel = types[0].iconLabel ?? '';
      }
    }

    app.docRegistry.addWidgetFactory(factory);
    factory.widgetCreated.connect(onWidgetCreated);

    const tracker = new WidgetTracker<IDocumentWidget<CardCollection>>({
      namespace: NS,
    });

    manager.cardsRequested.connect(async (sender, request) => {
      const content = new Cards(request.model, new CardsQueryModel(request.query));
      const main = new MainAreaWidget({ content });
      app.shell.add(main, 'main');
    });

    manager.newCardRequested.connect(async (sender, request) => {
      const content = new NewCard({ model: new NewCardModel(request) });
      const main = new MainAreaWidget({ content });
      const { toolbar } = main;
      toolbar.addItem('deck-picker', new DeckPicker(content.model));
      toolbar.addItem('model-picker', new CardModelPicker(content.model));
      toolbar.addItem('template-picker', new TemplatePicker(content.model));
      app.shell.add(main, 'main');
    });

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: 'docmanager:open',
        args: (widget) => ({ path: widget.context.path, factory: FACTORY }),
        name: (widget) => widget.context.path,
      });
    }

    return manager;
  },
  id: PLUGIN_ID,
  requires: [IEditorServices],
  optional: [ILayoutRestorer],
  provides: ICardManager,
  autoStart: true,
};

export default [corePlugin];

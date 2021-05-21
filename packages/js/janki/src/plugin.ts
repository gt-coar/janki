// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab,
  JupyterFrontEndPlugin,
  ILayoutRestorer,
} from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { IDocumentWidget, DocumentRegistry } from '@jupyterlab/docregistry';

import { CardCollectionFactory } from './factory';
import { jankiIcon, jankiPkgIcon } from './icons';
import { CardManager } from './manager';
import { NS, PLUGIN_ID, ICardManager, FACTORY, FILE_TYPES } from './tokens';
import { CardCollection } from './widgets';

/**
 * The editor tracker extension.
 */
const corePlugin: JupyterFrontEndPlugin<ICardManager> = {
  activate: (app: JupyterLab, restorer?: ILayoutRestorer) => {
    const manager = new CardManager();

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
  requires: [],
  optional: [ILayoutRestorer],
  provides: ICardManager,
  autoStart: true,
};

export default [corePlugin];

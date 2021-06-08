// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { JupyterLab, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { MainAreaWidget, ToolbarButton } from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { searchIcon, runIcon, linkIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

import { Model } from '../model';
import { SqlQuery } from '../query';
import { SQLiteQueryButton } from '../queryButton';
import { PLUGIN_ID, CommandIds, FACTORY_NAME } from '../tokens';

const mimeHelperPlugin: JupyterFrontEndPlugin<void> = {
  activate: (
    app: JupyterLab,
    editorServices: IEditorServices,
    editorTracker: IEditorTracker
  ) => {
    const { commands, docRegistry } = app;
    const button = new SQLiteQueryButton();
    button.queryRequested.connect((sender: any, args: any) => execute(args));
    button.commands = commands;
    docRegistry.addWidgetExtension(FACTORY_NAME, button);
    SqlQuery.setEditorServices(editorServices);

    let nextId = 0;

    const execute = async (args: any) => {
      // TODO: better
      let db: Model = args.db;
      if (!db) {
        let doc: Widget;
        try {
          doc = app.shell.activeWidget as any;
          db = (doc as any).content.layout.widgets[0].renderer.model as Model;
        } catch (err) {
          console.error(err);
          return;
        }
      }
      if (!db) {
        console.warn('no db');
        return;
      }
      const content = new SqlQuery({ db, query: args.query });
      content.id = `id-jp-sqlite-query-${nextId++}`;
      const main = new MainAreaWidget({ content });
      main.toolbar.addItem(
        'run',
        new ToolbarButton({
          tooltip: 'Run Query',
          icon: runIcon,
          onClick: async () => content.model.runQuery(),
        })
      );
      main.toolbar.addItem(
        'link',
        new ToolbarButton({
          tooltip: 'Link to Editor',
          icon: linkIcon,
          onClick: async () => {
            const candidates: Widget[] = [];
            editorTracker.forEach((editor) => {
              const { context } = editor;
              if (context.path.match(/.sql$/)) {
                candidates.push(editor);
              }
            });
            if (candidates.length === 1) {
              const { context } = candidates[0] as any;
              const { model } = context;
              const { value } = model as any;
              const update = () => {
                content.model.query = value.text;
              };
              value.changed.connect(update);
              context.saveState.connect(async () => {
                update();
                await content.model.runQuery();
              });
              content.model.stateChanged.connect(() => {
                if (value.text !== content.model.query) {
                  value.text = content.model.query;
                }
              });
              update();
            } else {
              console.log(candidates);
            }
          },
        })
      );
      app.shell.add(main, 'main', { mode: 'split-right' });
    };

    commands.addCommand(CommandIds.query, {
      label: 'query',
      icon: searchIcon,
      execute,
    });
  },
  requires: [IEditorServices, IEditorTracker],
  id: `${PLUGIN_ID}-helper`,
  autoStart: true,
};

export default [mimeHelperPlugin];

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { JupyterLab, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { MainAreaWidget, ToolbarButton, Toolbar } from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { searchIcon, runIcon, linkIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

import { Model } from '../model';
import { SqlQuery } from '../query';
import { SQLiteQueryButton } from '../queryButton';
import { queryFilePicker } from '../queryFilePicker';
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
      content.title.icon = searchIcon;
      content.id = `id-jp-sqlite-query-${nextId++}`;
      const main = new MainAreaWidget({ content });
      const { toolbar } = main;

      const runBtn = new ToolbarButton({
        tooltip: 'Run Query',
        icon: runIcon,
        onClick: async () => content.model.runQuery(),
      });

      const linkBtn = new ToolbarButton({
        tooltip: 'Link to Editor',
        icon: linkIcon,
        onClick: async () => {
          app.shell.activateById(main.id);
          const candidates: IDocumentWidget<FileEditor>[] = [];

          editorTracker.forEach((editor) => {
            const { context } = editor;
            if (context.path.match(/.sql$/)) {
              candidates.push(editor);
            }
          });

          const link = await Private.updateLink(content, candidates);

          if (!link) {
            (linkBtn as any).props.label = '';
          } else {
            (linkBtn as any).props.label = link.editor.context.path;
          }

          linkBtn.update();
        },
      });

      // actually add items
      toolbar.addItem('run', runBtn);
      toolbar.addItem('spacer', Toolbar.createSpacerItem());
      toolbar.addItem('link', linkBtn);
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

namespace Private {
  interface IDocLink {
    editor: any;
    query: SqlQuery;
  }

  const links = new WeakMap<Widget, DocLink>();

  export class DocLink implements IDocLink {
    editor: IDocumentWidget<FileEditor>;
    query: SqlQuery;

    constructor(options: IDocLink) {
      this.editor = options.editor;
      this.query = options.query;
      this.init();
    }

    init(): void {
      const { context } = this.editor as any;
      const { model } = context;
      const { value } = model as any;
      value.changed.connect(this.updateQuery, this);
      context.saveState.connect(this.onContextSaveState, this);
      this.query.model.stateChanged.connect(this.onModelStateChanged, this);
      this.updateQuery();
    }

    dispose() {
      const { context } = this.editor as any;
      const { model } = context;
      const { value } = model as any;
      value.changed.disconnect(this.updateQuery, this);
      context.saveState.disconnect(this.onContextSaveState, this);
      this.query.model.stateChanged.disconnect(this.onModelStateChanged, this);
    }

    onContextSaveState = async (): Promise<void> => {
      this.updateQuery();
      await this.query.model.runQuery();
    };

    onModelStateChanged = async (): Promise<void> => {
      const { value } = this.editor.context.model as any;
      const { query } = this.query.model;
      if (value.text !== query) {
        value.text = query;
      }
    };

    updateQuery() {
      this.query.model.query = (this.editor.context.model as any).value.text;
    }
  }

  export function linkLabel(query: SqlQuery) {
    const link = links.get(query);
    if (!link) {
      return 'Link to file...';
    }
    return link.editor.context.path;
  }

  export async function updateLink(
    query: SqlQuery,
    candidates: IDocumentWidget<FileEditor>[]
  ): Promise<DocLink | null> {
    const incumbent = links.get(query);

    let editor: IDocumentWidget<FileEditor> | null = candidates[0] || null;

    if (candidates.length > 1) {
      editor = await queryFilePicker(candidates);
    }

    if (incumbent && editor === incumbent.editor) {
      return incumbent;
    }

    if (incumbent) {
      incumbent.dispose();
      if (!editor) {
        links.delete(query);
      }
    }

    if (editor) {
      const link = new DocLink({ query, editor });
      links.set(query, link);
      return link;
    }

    return null;
  }
}

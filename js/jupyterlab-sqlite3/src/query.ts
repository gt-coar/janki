// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';
import { IEditorServices, CodeEditor } from '@jupyterlab/codeeditor';
import { Mode } from '@jupyterlab/codemirror';
import { PromiseDelegate } from '@lumino/coreutils';
import type { DataGrid, JSONModel } from '@lumino/datagrid';
import { SplitPanel, Widget, Panel, PanelLayout } from '@lumino/widgets';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'jp-SQLite3-Query';

import { Model as DBModel } from './model';

/** a split panel with syntax-hilighted SQL and a query response table */
export class SqlQuery extends SplitPanel {
  model: QueryModel;

  /** A */
  protected _db: DBModel;
  /** A JupyterLab editor */
  protected _editor: CodeEditor.IEditor;
  protected _editorPanel: Widget;
  /** A lumino data grid */
  protected _grid: DataGrid;
  protected _gridPanel: Panel;

  static setEditorServices(editorServices: IEditorServices): void {
    Private.setEditorServices(editorServices).catch(console.warn);
  }

  constructor(options: SqlQuery.IOptions) {
    super();
    this.orientation = 'vertical';
    this.model = new QueryModel({ db: options.db, query: options.query || '' });
    this.addClass(CLASS_NAME);
    this._db = options.db;
    this._editorPanel = new Widget();
    this._gridPanel = new Panel();
    this._gridPanel.addClass(`${CLASS_NAME}-Grid`);
    [this._editorPanel, this._gridPanel].map((w) => this.addWidget(w));
    this.createEditor().catch(console.warn);
    this.createGrid().catch(console.warn);
    this.model.stateChanged.connect(() => {
      const { results, queryTime } = this.model;
      const roughQueryTime = `${queryTime}`.slice(0, 4);
      this.title.label = `${results ? results.length : ''} rows in ${roughQueryTime}ms`;
    });
  }

  protected createEditor = async (): Promise<void> => {
    if (!this.isAttached) {
      setTimeout(this.createEditor, 100);
      return;
    }
    const editorServices = await Private.editorServices();

    this._editor = editorServices.factoryService.newDocumentEditor({
      host: this._editorPanel.node,
      model: new CodeEditor.Model(),
    });
    try {
      const mode = await Mode.ensure('sql');
      if (mode?.mime) {
        this._editor.model.mimeType = mode.mime;
      }
    } catch (err) {
      console.warn('mode', err);
    }

    this._editor.model.value.changed.connect(() => {
      try {
        this.model.query = this._editor.model.value.text;
      } catch (err) {
        console.log(err);
      }
    });
    this.model.stateChanged.connect(() => {
      try {
        if (this._editor.model.value.text != this.model.query) {
          this._editor.model.value.text = this.model.query;
        }
      } catch (err) {
        console.log(err);
      }
    });

    if (this.model.query) {
      try {
        this._editor.model.value.text = this.model.query;
      } catch (err) {
        console.log(err);
      }
    }
  };

  protected createGrid = async (): Promise<void> => {
    if (!this.isAttached) {
      setTimeout(this.createGrid, 100);
      return;
    }
    const { SQLiteJSONModel } = await import('./queryGridModel');

    const { DataGrid, BasicKeyHandler, BasicMouseHandler, BasicSelectionModel } =
      await import('@lumino/datagrid');
    const grid = (this._grid = new DataGrid());
    grid.editingEnabled = true;
    grid.stretchLastColumn = true;
    grid.stretchLastRow = true;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = new BasicMouseHandler();
    (this._gridPanel.layout as PanelLayout).addWidget(grid);
    this.model.stateChanged.connect(() => {
      const data = this.model.results;
      const schema = this.model.resultsSchema;
      grid.dataModel = new SQLiteJSONModel({ data, schema });
      grid.selectionModel = new BasicSelectionModel({ dataModel: grid.dataModel });
    });
    this.model.runQuery().catch(console.warn);
  };
}

/** A namespace for SQLite queries */
export namespace SqlQuery {
  /** Constructor options for a `SqlQuery` */
  export interface IOptions {
    db: DBModel;
    query?: string | null;
  }
}

namespace Private {
  let _editorServices: IEditorServices | null = null;

  const _hasEditorServices = new PromiseDelegate<void>();

  export async function editorServices(): Promise<IEditorServices> {
    await hasEditorServices();
    return _editorServices as IEditorServices;
  }

  export function hasEditorServices(): Promise<void> {
    return _hasEditorServices.promise;
  }

  export async function setEditorServices(editorServices: IEditorServices) {
    if (_editorServices && editorServices) {
      return;
    }
    _editorServices = editorServices;
    _hasEditorServices.resolve();
  }
}

export class QueryModel extends VDomModel {
  private _db: DBModel;
  private _query: string;
  private _results: Record<string, any>[];
  private _queryTime = 0;

  constructor(options: QueryModel.IOptions) {
    super();
    this.db = options.db;
    if (options.query) {
      this._query = options.query;
      this.runQuery().catch(console.warn);
    }
  }

  get db() {
    return this._db;
  }

  set db(db) {
    if (this._db) {
      this._db.stateChanged.disconnect(this.changed, this);
    }
    this._db = db;
    if (this._db) {
      this._db.stateChanged.connect(this.changed, this);
    }
    this.changed();
  }

  get query() {
    return this._query;
  }

  set query(query: string) {
    this._query = query;
    this.changed();
  }

  get results() {
    return this._results || [];
  }

  set results(results: Record<string, any>[]) {
    this._results = results;
    this.changed();
  }

  get resultsSchema() {
    const { results } = this;
    if (!results.length) {
      return { fields: [] };
    }

    let fields = [] as JSONModel.Field[];

    for (const [k, v] of Object.entries(results[0])) {
      let fieldType = 'string';

      switch (typeof v) {
        case 'number':
          fieldType = 'number';
          break;
        default:
          break;
      }

      fields.push({ name: k, type: fieldType });
    }

    return { fields };
  }

  protected changed(): void {
    this.stateChanged.emit(void 0);
  }

  get queryTime() {
    return this._queryTime || 0;
  }

  async runQuery() {
    const start = performance.now();
    try {
      this.results = await this._db.query(this._query);
    } catch (err) {
      console.error('run', err);
      this.results = [{ error: err }];
    }
    this._queryTime = performance.now() - start;
    this.changed();
  }
}

export namespace QueryModel {
  export interface IOptions {
    db: DBModel;
    query?: string;
  }
}

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';

import { ensureSQLite } from './sqlite';
import { ISQLiteWorker, IRemoteSQLWorker } from './tokens';

const Q_TABLE_COLUMNS = `
SELECT
    m.name as tableName,
    p.*
FROM sqlite_master m
left outer join pragma_table_info((m.name)) p
     on m.name <> p.name
order by tableName, p.name;
`;

export class Model extends VDomModel {
  private _data: string;
  private _db: ISQLiteWorker.IDBMeta;
  private _tables: Model.TTableMap = new Map();
  private _array: Uint8Array;
  private _queryRequested = new Signal<Model, any>(this);
  private _dataChanged = new Signal<Model, any>(this);

  dispose() {
    if (this.isDisposed) {
      return;
    }
    if (this._db) {
      void Private.SQL.close(this._db);
      this._db = null as any;
    }
    super.dispose();
  }

  get queryRequested(): ISignal<Model, any> {
    return this._queryRequested;
  }

  requestQuery(args: any) {
    this._queryRequested.emit(args);
  }

  set data(data: string) {
    this._data = data;
    this.updateArray().catch(console.error);
  }

  get data() {
    return this._data;
  }

  get array() {
    return this._array;
  }

  set array(array: Uint8Array) {
    this._array = array;
    this.updateDb().catch(console.error);
  }

  async query<T = any>(
    sqlString: string,
    bindings?: Record<string, any>
  ): Promise<T[]> {
    let result: T[] = [];
    if (this._db) {
      const raw = await Private.SQL.exec(this._db, sqlString);
      if (raw.length) {
        const { columns, values } = raw.slice(-1)[0];
        const nColumns = columns.length;
        const nRows = values.length;
        result = new Array(nRows);

        for (let i = 0; i < nRows; i++) {
          result[i] = {} as any;
          for (let j = 0; j < nColumns; j++) {
            (result[i] as any)[columns[j]] = values[i][j];
          }
        }
      }
    }
    return result;
  }

  get tables() {
    return this._tables;
  }

  protected async updateArray(): Promise<void> {
    const bs = atob(this._data);
    const ab = new ArrayBuffer(bs.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < bs.length; i++) {
      ia[i] = bs.charCodeAt(i);
    }
    this._array = ia;
    await this.updateDb();
  }

  async saveToModel(): Promise<boolean> {
    const binArray = await Private.SQL.export(this._db);
    if (!binArray) {
      return false;
    }
    const b64 = btoa(String.fromCharCode.apply(null, binArray));
    console.table([
      { what: 'old', length: this._data.length, data: this._data },
      { what: 'new', length: b64.length, data: b64 },
    ]);
    if (b64 === this._data) {
      return false;
    }
    this._data = b64;
    this._dataChanged.emit(void 0);
    return true;
  }

  get dataChanged(): ISignal<Model, void> {
    return this._dataChanged;
  }

  protected async updateDb(): Promise<void> {
    if (!Private.SQL) {
      await Private._ensureSQLite();
    }

    this._db = await Private.SQL.open({ data: this._array });
    await this.updateTables();
  }

  protected async updateTables(): Promise<void> {
    const tables: Model.TTableMap = new Map();
    if (this._db) {
      const rows = await this.query<Model.IColumnWithTableName>(Q_TABLE_COLUMNS);
      for (const row of rows) {
        const { tableName, ...column } = row;
        let table = tables.get(tableName);
        if (!table) {
          table = { name: tableName, columns: new Map() };
          tables.set(tableName, table);
        }
        table.columns.set(column.name, column);
      }
    }
    this._tables = tables;
    this.stateChanged.emit(void 0);
  }
}

export namespace Model {
  export type TTableMap = Map<string, ITable>;
  export type TColumnMap = Map<string, IColumn>;
  export interface ITable {
    columns: TColumnMap;
    name: string;
  }

  export interface IColumn {
    cid: number;
    dflt_value: any | null;
    name: string;
    notnull: 0 | 1;
    pk: 0 | 1;
    type: string;
  }

  export interface IColumnWithTableName extends IColumn {
    tableName: string;
  }
}

namespace Private {
  export let SQL: IRemoteSQLWorker;

  export async function _ensureSQLite(): Promise<void> {
    if (!SQL) {
      SQL = await ensureSQLite();
    }
  }
}

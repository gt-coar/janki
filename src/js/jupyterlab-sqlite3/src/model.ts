// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomModel } from '@jupyterlab/apputils';
import { Database } from 'sql.js';

import { ensureSQLite } from './sqlite';

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
  private _db: Database | null;
  private _tables: Model.TTableMap = new Map();

  dispose() {
    if (this.isDisposed) {
      return;
    }
    if (this._db) {
      this._db.close();
      this._db = null;
    }
    super.dispose();
  }

  set data(data: string) {
    this._data = data;
    this.updateDb().catch(console.error);
  }

  get data() {
    return this._data;
  }

  get db() {
    return this._db;
  }

  get tables() {
    return this._tables;
  }

  protected async updateDb(): Promise<void> {
    const bs = atob(this._data);
    const ab = new ArrayBuffer(bs.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < bs.length; i++) {
      ia[i] = bs.charCodeAt(i);
    }
    const SQL = await ensureSQLite();
    this._db = new SQL.Database(ia);
    await this.updateTables();
  }

  protected async updateTables(): Promise<void> {
    const tables: Model.TTableMap = new Map();
    if (this._db) {
      const stmt = this._db.prepare(Q_TABLE_COLUMNS);
      while (stmt.step()) {
        //
        const { tableName, ...column } =
          stmt.getAsObject() as unknown as Model.IColumnWithTableName;
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

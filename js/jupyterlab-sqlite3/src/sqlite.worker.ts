// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

/**
 * This is proxied by Comlink to move sqlite actions off the main thread
 */

let NEXT_ID = 0;

import { expose } from 'comlink';
import type * as SQL from 'sql.js';

import { ISQLiteWorker } from './tokens';

import * as SQL_WASM_URL from '!!file-loader!sql.js/dist/sql-wasm.wasm';

export class SQLiteWorker implements ISQLiteWorker {
  private _SQL: SQL.SqlJsStatic;
  private _dbs: Map<string, SQL.Database> = new Map();

  async open(options: ISQLiteWorker.IOpenOptions): Promise<ISQLiteWorker.IDBMeta> {
    await this.SQL();
    const meta: ISQLiteWorker.IDBMeta = { id: `${++NEXT_ID}` };
    this._dbs.set(meta.id, new this._SQL.Database(options.data));
    return meta;
  }

  async exec(
    dbMeta: ISQLiteWorker.IDBMeta,
    sql: string,
    bindParams?: SQL.BindParams
  ): Promise<SQL.QueryExecResult[]> {
    const db = this._dbs.get(dbMeta.id);

    if (!db) {
      throw new Error(`Unknown db: ${dbMeta.id}`);
    }

    return db.exec(sql, bindParams);
  }

  async export(dbMeta: ISQLiteWorker.IDBMeta): Promise<Uint8Array> {
    const db = this._dbs.get(dbMeta.id);

    if (!db) {
      throw new Error(`Unknown db: ${dbMeta.id}`);
    }

    return db.export();
  }

  async close(dbMeta: ISQLiteWorker.IDBMeta): Promise<void> {
    const db = this._dbs.get(dbMeta.id);

    if (db) {
      db.close();
      this._dbs.delete(dbMeta.id);
    }
  }

  async SQL(): Promise<SQL.SqlJsStatic> {
    if (!this._SQL) {
      this._SQL = await this.initSQL();
    }
    return this._SQL;
  }

  async initSQL(): Promise<SQL.SqlJsStatic> {
    const initSqlJs = await import('sql.js');

    return await initSqlJs.default({
      locateFile: (file: string) => {
        switch (file) {
          case 'sql-wasm.wasm':
            return SQL_WASM_URL.default;
            break;
          default:
            throw new Error(`UNEXPECTED SQL.JS FILE ${file}`);
        }
      },
    });
  }
}

const worker = new SQLiteWorker();

expose(worker);

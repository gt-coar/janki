// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

/**
 * This is proxied by Comlink to move sqlite actions off the main thread
 */

import * as Comlink from "comlink";

import type * as _SQL from 'sql.js';

import * as SQL_WASM_URL from '!!file-loader!sql.js/dist/sql-wasm.wasm';

export async function open(options: IOpenOptions): Promise<IOpenOptions> {
  await Private.open(options);
  return options;
}

export async function each(
  sql: string,
  params: _SQL.BindParams,
  callback: _SQL.ParamsCallback,
  done: () => void
): Promise<any> {
  console.log('each', [sql, params, callback, done]);
  return [sql, params, callback, done];
}

namespace Private {
  let SQL: _SQL.SqlJsStatic;

  const dbs = new Map<string, _SQL.Database>();

  async function sql(): Promise<_SQL.SqlJsStatic> {
    console.log('sql was', SQL);

    if (!SQL) {
      const initSqlJs = await import('sql.js');

      SQL = await initSqlJs.default({
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
      console.log('sql is', SQL);
    }
    return SQL;
  }

  export async function open(args: IOpenOptions) {
    console.log('opening', args);
    await sql();
    dbs.set(args.id, new SQL.Database());
    console.log('opened', args);
  }

  export async function close(args: IOpenOptions) {
    console.log('closing', args);
    await sql();
    const db = dbs.get(args.id);
    if (db) {
      db.close();
      dbs.delete(args.id);
    }
    console.log('closed', args);
  }

  export function db(id: string): _SQL.Database | null {
    return dbs.get(id) || null;
  }
}

/**
 * options for establishing a database connection
 */
export interface IOpenOptions {
  /** the unique Database identifier */
  id: string;
}

const workerApi = { open, each };

Comlink.expose(workerApi);
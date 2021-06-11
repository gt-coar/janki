// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PromiseDelegate } from '@lumino/coreutils';
import type { SqlJsStatic } from 'sql.js';

import * as SQL_WASM_URL from '!!file-loader!sql.js/dist/sql-wasm.wasm';

let SQL: SqlJsStatic;

let LOADING: PromiseDelegate<SqlJsStatic>;

let worker: any;

export async function ensureSQLite(): Promise<SqlJsStatic> {
  if (!worker) {
    try {
      worker = await initWorker();
    } catch (err) {
      console.error(err);
    } finally {
      console.log('worker', worker);
    }
  }

  if (SQL) {
    return SQL;
  }
  if (LOADING) {
    return await LOADING.promise;
  }

  LOADING = new PromiseDelegate();

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
  LOADING.resolve(SQL);

  return SQL;
}

async function initWorker(): Promise<any> {
  const Worker = (await import('./sqlite.comlink')) as any;
  const worker = new Worker();
  console.log(worker);
  return worker;
}

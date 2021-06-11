// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PromiseDelegate } from '@lumino/coreutils';
import type { SqlJsStatic } from 'sql.js';

import * as SQL_WASM_URL from '!!file-loader!sql.js/dist/sql-wasm.wasm';

import SQLite3Worker from "./worker.ts";

let SQL: SqlJsStatic;

let LOADING: PromiseDelegate<SqlJsStatic>;

let worker: Worker;

export async function ensureSQLite(): Promise<SqlJsStatic> {
  if(!worker) {
    try {
      worker = await initWorker();
    } catch(err) {
      console.error(err);
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

export async function initWorker(): Promise<SQLite3Worker> {
  const worker = new SQLite3Worker();
  console.log(worker);
  worker.postMessage({ limit: 1000 });
  worker.onmessage = (event: MessageEvent) => {
    console.log('host', event)
  };
  return worker;
}

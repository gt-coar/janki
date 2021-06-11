// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PromiseDelegate } from '@lumino/coreutils';

import type { SqlJsStatic } from 'sql.js';

import * as SQL_WASM_URL from '!!file-loader!sql.js/dist/sql-wasm.wasm';

let SQL: SqlJsStatic;

let LOADING: PromiseDelegate<SqlJsStatic>;

console.log('worker started', event);

// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;

export async function ensureSQLite(): Promise<SqlJsStatic> {
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

class SQLite3Worker {
  calculate(limit: number): string[] {
    return ["woo"];
  }
}

// Setup a new prime sieve once on instancation
const worker = new SQLite3Worker();

// We send a message back to the main thread
ctx.addEventListener("message", (event: MessageEvent) => {
  // Get the limit from the event data
  const limit = event.data.limit;

  // Calculate the primes
  const primes = worker.calculate(limit);

  // Send the primes back to the main thread
  ctx.postMessage({ primes });
});
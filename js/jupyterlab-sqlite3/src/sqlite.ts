// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PromiseDelegate } from '@lumino/coreutils';

import { IRemoteSQLWorker } from './tokens';

let COMM: IRemoteSQLWorker;
let LOADING: PromiseDelegate<IRemoteSQLWorker> | undefined;

export async function ensureSQLite(): Promise<IRemoteSQLWorker> {
  if (LOADING) {
    return LOADING.promise;
  }

  if (!COMM) {
    LOADING = new PromiseDelegate();

    try {
      COMM = await initComm();
      LOADING.resolve(COMM);
    } catch (err) {
      LOADING.reject(err);
    } finally {
      LOADING = void 0;
    }
  }

  return COMM;
}

async function initComm(): Promise<IRemoteSQLWorker> {
  const { wrap } = await import('comlink');
  // const workerUrl: any = await import('!!file-loader!./sqlite.worker');
  const worker = new Worker(new URL('./sqlite.worker.js', import.meta.url), {
    type: 'module',
  });
  const obj: any = wrap(worker);
  return obj;
}

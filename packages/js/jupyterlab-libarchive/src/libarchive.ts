// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PromiseDelegate } from '@lumino/coreutils';
import type { IArchiveJsStatic } from 'libarchive.js';

import * as WORKER_URL from '!!file-loader!libarchive.js/dist/worker-bundle.js';

let LIB_ARCHIVE: IArchiveJsStatic;
let LOADING: PromiseDelegate<IArchiveJsStatic>;

export async function ensureLibArchive(): Promise<IArchiveJsStatic> {
  if (LIB_ARCHIVE) {
    return LIB_ARCHIVE;
  }
  if (LOADING) {
    return await LOADING.promise;
  }

  LOADING = new PromiseDelegate();

  const ArchiveJS: any = await import('libarchive.js');

  ArchiveJS.Archive.init({ workerUrl: WORKER_URL.default });

  LIB_ARCHIVE = ArchiveJS.Archive;
  LOADING.resolve(ArchiveJS.Archive);

  return LIB_ARCHIVE;
}

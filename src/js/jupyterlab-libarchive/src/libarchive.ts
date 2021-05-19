// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { PromiseDelegate } from '@lumino/coreutils';
import type { IArchiveJsStatic } from 'libarchive.js';

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

  const ArchiveJS = await import('libarchive.js');

  ArchiveJS.default.init();

  LIB_ARCHIVE = ArchiveJS.default;
  LOADING.resolve(ArchiveJS.default);

  return LIB_ARCHIVE;
}

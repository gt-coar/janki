// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { VDomModel } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import type { IArchive, ICompressedFileEntry } from 'libarchive.js';

import { ensureLibArchive } from './libarchive';

export class Model extends VDomModel {
  private _data: string;
  private _archive: IArchive;
  private _file: File;
  private _members: Model.TFileMap = new Map();

  get data() {
    return this._data;
  }

  set data(data: string) {
    this._data = data;
    this.updateFile().catch(console.error);
  }

  get archive() {
    return this._archive;
  }

  get file() {
    return this._file;
  }

  get members() {
    return this._members;
  }

  protected async updateFile(): Promise<void> {
    const bs = atob(this._data);
    let ab = new ArrayBuffer(bs.length);
    let ia = new Uint8Array(ab);
    for (let i = 0; i < bs.length; i++) {
      ia[i] = bs.charCodeAt(i);
    }
    this._file = new File([ab], 'a.zip');
    await this.updateArchive();
  }
  protected async updateArchive(): Promise<void> {
    const Archive = await ensureLibArchive();
    this._archive = await Archive.open(this._file);
    await this.updateFiles();
  }
  protected async updateFiles(): Promise<void> {
    const members: Model.TFileMap = new Map();
    for (const member of await this._archive.getFilesArray()) {
      members.set(URLExt.join(member.path, member.file.name), member);
    }
    this._members = members;
    this.stateChanged.emit(void 0);
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    const { _worker } = this._archive;
    if (_worker) {
      _worker.terminate();
      this._archive._worker = null;
    }
    super.dispose();
  }
}

export namespace Model {
  export type IEntry = ICompressedFileEntry;
  export type TFileMap = Map<string, IEntry>;
}

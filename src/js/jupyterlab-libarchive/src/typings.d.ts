// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

declare module '!!file-loader*' {
  const script: string;
  export default script;
}

declare module '*.svg' {
  const script: string;
  export default script;
}

declare module 'libarchive.js' {
  export interface IArchive {
    close(): void;
    extractFiles(): Promise<IFileTree>;
    getFilesArray(): Promise<ICompressedFileEntry[]>;
    getFilesObject(): Promise<ICompressedFileTree>;
    hasEncryptedData(): Promise<boolean | null>;
    usePassword(archivePassword: string): Promise<void>;
    _worker: Worker | null;
  }

  export interface IFileTree {
    [key: string]: File | IFileTree;
  }

  export interface ICompressedFileTree {
    [key: string]: ICompressedFile | IFileTree;
  }

  export interface ICompressedFile {
    name: string;
    size: number;
    extract(): Promise<File>;
  }

  export interface ICompressedFileEntry {
    path: string;
    file: ICompressedFile;
  }

  export namespace IArchive {
    export interface IOptions {
      workerUrl?: string;
    }
  }

  export interface IArchiveJsStatic {
    init(options?: IArchive.IOptions): IArchive.IOptions;
    open(file: File): Promise<IArchive>;
  }

  declare global {
    let ArchiveJS: IArchiveJsStatic;
  }
  // eslint-disable-next-line
  export default ArchiveJS;
}

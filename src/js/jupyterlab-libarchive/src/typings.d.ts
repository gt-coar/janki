// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

declare module 'libarchive.js' {
  export interface IArchive {
    close(): void;
    hasEncryptedData(): Promise<boolean | null>;
    usePassword(archivePassword: string): Promise<void>;
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

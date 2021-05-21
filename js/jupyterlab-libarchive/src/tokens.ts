// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { LabIcon } from '@jupyterlab/ui-components';

import * as PACKAGE_ from '../package.json';
import ARCHIVE_ICON_SVG from '../style/img/icon.svg';

export const PACKAGE = PACKAGE_;
export const NS = PACKAGE['name'];
export const PLUGIN_ID = `${NS}:plugin`;

export const MIME_TYPE = 'application/vnd.sqlite3';

export const archiveIcon = new LabIcon({
  name: `${NS}:icon`,
  svgstr: ARCHIVE_ICON_SVG,
});

/**
 * Supported formats: ZIP, 7-Zip, RAR v4, RAR v5, TAR.
 * Supported compression: GZIP, DEFLATE, BZIP2, LZMA
 */
export const FILE_TYPES = [
  {
    name: 'Archive (zip)',
    mimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/zip-compressed',
    ],
    extensions: ['.zip'],
    icon: archiveIcon.name,
  },
];

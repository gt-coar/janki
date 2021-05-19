// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
import { LabIcon } from '@jupyterlab/ui-components';

import * as PACKAGE_ from '../package.json';
import SQLITE_ICON_SVG from '../style/img/icon.svg';

export const PACKAGE = PACKAGE_;
export const NS = PACKAGE['name'];
export const PLUGIN_ID = `${NS}:plugin`;

export const sqliteIcon = new LabIcon({
  name: `${NS}:icon`,
  svgstr: SQLITE_ICON_SVG,
});

/**
 * The default mime type for the extension.
 */
export const MIME_TYPE = 'application/vnd.sqlite3';

export const FILE_TYPE = {
  name: 'SQLite3',
  mimeTypes: [MIME_TYPE, 'application/x-sqlite3'],
  extensions: ['.sqlite3', '.sqlite', '.db'],
  icon: sqliteIcon.name,
};

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { PLUGIN_ID, FILE_TYPES } from './tokens';
import { rendererFactory } from './widget';

/**
 * Extension definition.
 *
 * @todo rest of file types
 */
const extension: IRenderMime.IExtension = {
  id: PLUGIN_ID,
  rendererFactory,
  rank: 0,
  dataType: 'string',
  fileTypes: FILE_TYPES,
  documentWidgetFactoryOptions: {
    name: FILE_TYPES[0].name,
    primaryFileType: FILE_TYPES[0].name,
    fileTypes: [FILE_TYPES[0].name],
    defaultFor: [FILE_TYPES[0].name],
  },
};

export default extension;

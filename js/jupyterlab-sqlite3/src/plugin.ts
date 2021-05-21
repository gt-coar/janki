// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { PLUGIN_ID, FILE_TYPE } from './tokens';
import { rendererFactory } from './widget';

/**
 * Extension definition.
 */
const extension: IRenderMime.IExtension = {
  id: PLUGIN_ID,
  rendererFactory,
  rank: 0,
  dataType: 'string',
  fileTypes: [FILE_TYPE],
  documentWidgetFactoryOptions: {
    name: FILE_TYPE.name,
    modelName: 'base64',
    primaryFileType: FILE_TYPE.name,
    fileTypes: [FILE_TYPE.name],
    defaultFor: [FILE_TYPE.name],
  },
};

export default extension;

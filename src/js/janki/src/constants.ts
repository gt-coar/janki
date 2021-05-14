// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import * as SCHEMA from '../schema/plugin.json';

const { definitions } = SCHEMA;

export const API_NS = definitions['api-url-root'].default;
export const EXTENSIONS = definitions['api-extensions'].default;

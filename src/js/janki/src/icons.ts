// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { LabIcon } from '@jupyterlab/ui-components';

import JANKI_SVG from '../style/img/janki.svg';

import { NS } from './tokens';

export const jankiIcon = new LabIcon({ name: `${NS}:janki`, svgstr: JANKI_SVG });

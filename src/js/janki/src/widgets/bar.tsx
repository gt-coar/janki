// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import * as React from 'react';

import { CollectionModel } from '../models/collection';
import { CSS } from '../tokens';

export class CollectionBar extends VDomRenderer<CollectionModel> {
  constructor(model: CollectionModel) {
    super(model);
    this.addClass(CSS.bar);
  }

  protected render() {
    const { collection } = this.model;
    const path = collection?.path || 'Loading...';
    return <h1>{path}</h1>;
  }
}

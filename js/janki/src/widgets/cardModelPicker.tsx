// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import * as React from 'react';

import * as SCHEMA from '../_schema';
import { INewCardModel, CSS } from '../tokens';

export class CardModelPicker extends VDomRenderer<INewCardModel> {
  constructor(model: INewCardModel) {
    super(model);
    [CSS.modelPicker, CSS.LAB.default, CSS.LAB.select].map((cls) => this.addClass(cls));
  }

  protected render() {
    const { models, card } = this.model;

    return (
      <select
        className={CSS.LAB.styled}
        onInput={this.onChange}
        defaultValue={`${card.mid || ''}`}
        title="Model"
      >
        {models.map(this.renderOption)}
      </select>
    );
  }

  protected renderOption = (model: SCHEMA.Model) => {
    return (
      <option key={model.id} value={model.id}>
        {model.name}
      </option>
    );
  };

  protected onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(evt.currentTarget.value);
  };
}

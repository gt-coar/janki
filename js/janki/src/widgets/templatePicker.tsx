// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import { HTMLSelect } from '@jupyterlab/ui-components';
import * as React from 'react';

import * as SCHEMA from '../_schema';
import { INewCardModel, CSS } from '../tokens';

export class TemplatePicker extends VDomRenderer<INewCardModel> {
  constructor(model: INewCardModel) {
    super(model);
    this.addClass(CSS.picker);
  }

  protected render() {
    const { card, templates } = this.model;

    return [
      <label key="label">Template</label>,
      <HTMLSelect
        key="select"
        onInput={this.onChange}
        defaultValue={card.ord}
        aria-label="Template"
        title="Select Template"
      >
        {templates.map(this.renderOption)}
      </HTMLSelect>,
    ];
  }

  protected renderOption = (template: SCHEMA.Template) => {
    return (
      <option key={template.ord} value={template.ord}>
        {template.name}
      </option>
    );
  };

  protected onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    this.model.card = { ...this.model.card, ord: parseInt(evt.currentTarget.value) };
  };
}

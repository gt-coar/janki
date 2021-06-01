// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import { HTMLSelect } from '@jupyterlab/ui-components';
import * as React from 'react';

import * as SCHEMA from '../_schema';
import { INewCardModel, CSS } from '../tokens';

export class DeckPicker extends VDomRenderer<INewCardModel> {
  constructor(model: INewCardModel) {
    super(model);
    this.addClass(CSS.picker);
  }

  protected render() {
    const { decks, card } = this.model;

    return [
      <label key="label">Deck</label>,
      <HTMLSelect
        key="select"
        onInput={this.onChange}
        defaultValue={card.did}
        aria-label="Deck"
        title="Select Deck"
      >
        {decks.map(this.renderOption)}
      </HTMLSelect>,
    ];
  }

  protected renderOption = (deck: SCHEMA.Deck) => {
    return (
      <option key={deck.id} value={deck.id}>
        {deck.name}
      </option>
    );
  };

  protected onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    this.model.card = { ...this.model.card, did: parseInt(evt.currentTarget.value) };
  };
}

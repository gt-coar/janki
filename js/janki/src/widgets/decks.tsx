// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import * as React from 'react';

import * as SCHEMA from '../_schema';
import { CollectionModel } from '../models/collection';
import { CSS } from '../tokens';

export class Decks extends VDomRenderer<CollectionModel> {
  constructor(model: CollectionModel) {
    super(model);
    this.addClass(CSS.decks);
  }

  protected render() {
    const { collection } = this.model;

    if (!collection) {
      return <div>No Collection yet.</div>;
    }

    const { decks } = (collection.col || {})['1'];

    if (!decks) {
      return <div>No decks yet.</div>;
    }

    return (
      <table>
        <thead>
          <th>Name</th>
          <th>Cards</th>
        </thead>
        <tbody>{Object.values(decks).map(this.renderDeck)}</tbody>
      </table>
    );
  }

  renderDeck = (deck: SCHEMA.Deck) => {
    const cards = Object.values(this.model.collection?.cards || []).filter(
      (card) => card.did === deck.id
    );
    const onClick = () => {
      this.model.currentDeck = deck.id;
    };
    return (
      <tr key={deck.id}>
        <th>{deck.name}</th>
        <th>{cards.length}</th>
        <td>
          <button
            className={[CSS.LAB.styled, CSS.LAB.accept].join(' ')}
            onClick={onClick}
          >
            Open
          </button>
        </td>
      </tr>
    );
  };
}

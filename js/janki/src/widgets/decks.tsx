// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import { launcherIcon, addIcon } from '@jupyterlab/ui-components';
import * as React from 'react';

import * as SCHEMA from '../_schema';
import { CollectionModel } from '../models/collection';
import { CSS } from '../tokens';

export class Decks extends VDomRenderer<CollectionModel> {
  constructor(model: CollectionModel) {
    super(model);
    this.addClass(CSS.decks);
    this.addClass(CSS.cards);
  }

  protected render(): JSX.Element | JSX.Element[] {
    const { collection } = this.model;

    if (!collection) {
      return <div>No Collection yet.</div>;
    }

    const { decks } = (collection.col || {})['1'];

    if (!decks) {
      return <div>No decks yet.</div>;
    }

    return Object.values(decks).map(this.renderDeck);
  }

  renderDeck = (deck: SCHEMA.Deck) => {
    const cards = Object.values(this.model.collection?.cards || []).filter(
      (card) => card.did === deck.id
    );

    const onReview = () => this.model.requestDecks({ deckIds: [deck.id] });
    const onAdd = () => this.model.requestNewCard({ did: deck.id });

    return (
      <div key={deck.id} className={CSS.card}>
        <div className={CSS.template}>
          <label>
            <h3>{deck.name}</h3>
          </label>
        </div>
        <div className={CSS.meta}>
          <button
            className={[CSS.LAB.styled, CSS.LAB.accept].join(' ')}
            onClick={onAdd}
          >
            <addIcon.react tag="div" />
            <label>Card</label>
          </button>
          <label>{cards.length} Cards</label>
          <button
            className={[CSS.LAB.styled, CSS.LAB.accept].join(' ')}
            onClick={onReview}
          >
            <launcherIcon.react tag="div" />
            <label>Review</label>
          </button>
        </div>
      </div>
    );
  };
}

// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { Panel, PanelLayout } from '@lumino/widgets';

import * as SCHEMA from '../_schema';
import { DEBUG } from '../constants';
import { CollectionModel } from '../models/collection';
import { CSS } from '../tokens';

import { Card } from './card';

export class Cards extends Panel {
  readonly model: CollectionModel;
  readonly cards: Map<number, Card>;
  readonly style: HTMLStyleElement;
  readonly frame: HTMLIFrameElement;

  constructor(model: CollectionModel) {
    super();
    this.style = document.createElement('style');
    this.frame = document.createElement('iframe');
    this.frame.src = 'about:blank';
    this.cards = new Map();
    this.model = model;
    this.addClass(CSS.cards);
    this.model.stateChanged.connect(this.updateCards, this);
    // finally wire up dom
    this.node.appendChild(this.style);
    this.node.appendChild(this.frame);
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.model.stateChanged.disconnect(this.updateCards, this);
  }

  updateCards() {
    const { collection } = this.model;

    DEBUG && console.info('updateCards', collection);

    if (!collection) {
      return;
    }

    const deckCardIds = Object.values(collection.cards)
      .filter((card) => card.did == this.model.currentDeck)
      .map((card) => card.id);

    this.updateStyle();
    const panelLayout = this.layout as PanelLayout;
    for (const [cardId, widget] of this.cards.entries()) {
      if (deckCardIds.indexOf(cardId) === -1) {
        panelLayout.removeWidget(widget);
      }
    }
    for (const cardId of deckCardIds) {
      if (!this.cards.has(cardId)) {
        const widget = new Card(this.model, cardId);
        this.cards.set(cardId, widget);
        panelLayout.addWidget(widget);
      }
    }
  }

  /**
   * Update the style with all the models for this collection
   */
  updateStyle() {
    const { models } = this.model.collection.col['1'];
    if (!models) {
      return;
    }

    const oldStyle = this.style.textContent;
    const modelCSS: string[] = [];

    for (const [mid, model] of Object.entries(models)) {
      const modelStyle = this.prefixedModelStyle(mid, model);
      if (modelStyle) {
        modelCSS.push(modelStyle);
      }
    }

    let styleText = modelCSS.join('\n\n');

    if (styleText !== oldStyle) {
      this.style.textContent = styleText;
    }
  }

  prefixedModelStyle(mid: string, model: SCHEMA.Model): string {
    if (!this.frame.contentDocument) {
      return '';
    }
    const doc = this.frame.contentDocument;
    const styleId = `_${mid}`;
    let modelStyle: HTMLStyleElement | null = doc.getElementById(
      styleId
    ) as HTMLStyleElement;
    if (!modelStyle) {
      modelStyle = doc.createElement('style');
      modelStyle.id = styleId;
      doc.body.appendChild(modelStyle);
    }
    modelStyle.textContent = model.css;
    const sheet = modelStyle.sheet;
    if (!sheet) {
      return '';
    }
    let newStyles: string[] = [];
    for (let i = 0; i < sheet.rules.length; i++) {
      const rule = sheet.rules[i];
      const selectorText = (rule as any).selectorText;
      const innerText = rule.cssText.replace(/[^}]+\{(.*)\}/gm, '$1');
      if (!(innerText && selectorText)) {
        continue;
      }
      let newSelectors: string[] = [];
      for (const sel of selectorText.split(',')) {
        newSelectors.push(`.${CSS.model}-${mid} ${sel}`);
      }
      newStyles.push(`${newSelectors.join(', ')} { ${innerText} }`);
    }
    return newStyles.join('\n');
  }
}

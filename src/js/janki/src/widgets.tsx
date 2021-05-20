// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel, PanelLayout } from '@lumino/widgets';
import * as React from 'react';

import * as SCHEMA from './_schema';
import { DEBUG } from './constants';
import { Model } from './model';
import { ICardCollection, ICardManager, CSS } from './tokens';

export class CollectionBar extends VDomRenderer<Model> {
  constructor(model: Model) {
    super(model);
    this.addClass(CSS.bar);
  }

  protected render() {
    const { collection } = this.model;
    const path = collection?.path || 'Loading...';
    return <h1>{path}</h1>;
  }
}

export class Card extends VDomRenderer<Model> {
  readonly cardId: string;
  constructor(model: Model, cardId: string) {
    super(model);
    this.cardId = cardId;
    this.addClass(CSS.card);
    this.addClass(CSS.LAB.card);
  }

  protected render() {
    const { notes, cards } = this.model.collection;
    const card = cards[this.cardId];
    const note = notes[`${card.nid}`];
    // const model = (col["1"].models || {})[`${note.mid}`];

    return (
      <div className={`jp-JankiModel-${note.mid}`}>{this.renderFields(note, card)}</div>
    );
  }

  renderFields = (note: SCHEMA.Note, card: SCHEMA.Card) => {
    const flds = note.flds.split('\u001f');
    return <ul>{flds.map(this.renderField)}</ul>;
  };

  renderField = (field: string) => {
    return <div className={[CSS.field].join(' ')}>{field}</div>;
  };
}

export class Cards extends Panel {
  readonly model: Model;
  readonly cards: Map<string, Card>;
  readonly style: HTMLStyleElement;
  readonly frame: HTMLIFrameElement;

  constructor(model: Model) {
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

    this.updateStyle();
    const panelLayout = this.layout as PanelLayout;
    for (const [cardId, widget] of this.cards.entries()) {
      if (!collection.cards[cardId]) {
        panelLayout.removeWidget(widget);
      }
    }
    for (const cardId of Object.keys(collection.cards)) {
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
        newSelectors.push(`.jp-JankiModel-${mid} ${sel}`);
      }
      newStyles.push(`${newSelectors.join(', ')} { ${innerText} }`);
    }
    return newStyles.join('\n');
  }
}

export class CardCollection extends Panel {
  private _ready = new PromiseDelegate<void>();

  /**
   * The card collection widget's context.
   */
  readonly context: DocumentRegistry.Context;

  /**
   * The card collection widget's context.
   */
  readonly manager: ICardManager;

  readonly model: Model;

  /**
   * A promise that resolves when the collection viewer is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  constructor(options: ICardCollection.IOptions) {
    super();
    const { context, manager } = options;
    this.context = context;
    this.manager = manager;
    [CSS.collection, CSS.LAB.html, ...(DEBUG ? [CSS.debug] : [])].forEach((cls) =>
      this.addClass(cls)
    );
    const model = (this.model = new Model());
    const layout = this.layout as PanelLayout;

    const bar = new CollectionBar(model);
    const cards = new Cards(model);

    layout.addWidget(bar);
    layout.addWidget(cards);

    context.pathChanged.connect(this._onPathChanged, this);
    model.stateChanged.connect(this._onModelStateChanged, this);

    void context.ready.then(async () => {
      if (this.isDisposed) {
        return;
      }
      context.model.contentChanged.connect(this.update, this);
      context.fileChanged.connect(this.update, this);
    });

    // initialize
    this._onPathChanged().catch(console.warn);
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.context.model.contentChanged.disconnect(this.update, this);
    this.context.fileChanged.disconnect(this.update, this);
    this.model.stateChanged.disconnect(this._onModelStateChanged, this);
    this.model.dispose();
    super.dispose();
  }

  private _onModelStateChanged() {
    if (this.model.collection) {
      this._ready.resolve(void 0);
      this.model.stateChanged.disconnect(this._onModelStateChanged, this);
    }
  }

  /**
   * Handle a change to the title.
   */
  private async _onPathChanged(): Promise<void> {
    this.title.label = PathExt.basename(this.context.localPath);
    await this.context.ready;
    this.model.path = this.context.path;
    this.model.data = this.context.model.toString();
    // this.model.collection = await this.manager.collection(this.context.path);
  }
}

export namespace CardCollection {
  export interface IOptions {
    context: DocumentRegistry.Context;
  }
}

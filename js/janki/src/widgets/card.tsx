// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { VDomRenderer } from '@jupyterlab/apputils';
import Mustache from 'mustache';
import * as React from 'react';

import * as SCHEMA from '../_schema';
import { FIELD_DELIMITER } from '../constants';
import { CSS, ICardModel } from '../tokens';

Mustache.escape = function (text) {
  return text;
};

export class Card extends VDomRenderer<ICardModel> {
  constructor(model: ICardModel) {
    super(model);
    this.addClass(CSS.card);
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.model.dispose();
    super.dispose();
  }

  protected render() {
    const { collection } = this.model.collection;
    const { notes, cards, col } = collection;
    const card = cards[`${this.model.cardId}`];
    const note = notes[`${card.nid}`];
    const model = (col['1'].models || {})[`${note.mid}`];
    const template = model?.tmpls[card.ord];

    if (template) {
      return (
        <div className={`${CSS.model} ${CSS.model}-${note.mid}`}>
          {this.renderWithTemplate(card, note, model, template)}
        </div>
      );
    }

    return <div>{this.renderRawFields(card, note)}</div>;
  }

  renderRawFields = (card: SCHEMA.Card, note: SCHEMA.Note) => {
    const flds = note.flds.split(FIELD_DELIMITER);
    return <ul>{flds.map(this.renderRawField)}</ul>;
  };

  renderRawField = (field: string) => {
    return <div className={[CSS.field].join(' ')}>{field}</div>;
  };

  renderWithTemplate(
    card: SCHEMA.Card,
    note: SCHEMA.Note,
    model: SCHEMA.Model,
    template: SCHEMA.Template
  ) {
    const context = this.noteContext(note, model);
    const front = this.renderNoteTemplate(template.qfmt, context);
    const back = this.renderNoteTemplate(template.afmt, {
      FrontSide: front,
      ...context,
    });
    const className = `card${template.ord ? template.ord : ''}`;
    const radioName = `name-${card.id}`;
    const frontId = `id-front-${card.id}`;
    const backId = `id-back-${card.id}`;
    return (
      <div className={CSS.template}>
        <input type="radio" name={radioName} id={frontId} defaultChecked={true} />
        <label
          htmlFor={backId}
          className={className}
          dangerouslySetInnerHTML={{ __html: front }}
        ></label>
        <input type="radio" name={radioName} id={backId} />
        <label
          htmlFor={frontId}
          className={className}
          dangerouslySetInnerHTML={{ __html: back }}
        ></label>
      </div>
    );
  }

  noteContext(note: SCHEMA.Note, model: SCHEMA.Model): Record<string, string> {
    const fields = note.flds.split(FIELD_DELIMITER);
    const context: Record<string, string> = {};
    for (let i = 0; i < fields.length; i++) {
      for (const fld of model.flds) {
        if (fld.ord === i) {
          context[fld.name] = fields[i];
          break;
        }
      }
    }
    return context;
  }

  renderNoteTemplate(tmpl: string, context: Record<string, string>): string {
    let html = Mustache.render(tmpl, context);

    for (const path of Object.keys(this.model.collection.futureMedia)) {
      if (html.indexOf(path) !== -1) {
        html = html.replace(path, this.model.getMedia(path));
      }
    }

    return html;
  }
}

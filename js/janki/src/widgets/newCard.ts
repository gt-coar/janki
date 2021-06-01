// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { SplitPanel, Panel, PanelLayout } from '@lumino/widgets';

import * as SCHEMA from '../_schema';
import { jankiIcon } from '../icons';
import { FakeCardModel } from '../models/newCard';
import { INewCardModel, ICardModel, CSS } from '../tokens';

import { Card } from './card';

export class NewCard extends SplitPanel {
  model: INewCardModel;
  private _template: NewCard.Template;
  private _preview: NewCard.Preview;

  constructor(options: NewCard.IOptions) {
    super();
    const { model } = options;
    this.orientation = 'horizontal';
    this.model = model;
    this.addClass(CSS.newCard);
    this.title.label = 'New Card';
    this.title.icon = jankiIcon;
    this._template = new NewCard.Template({ model });
    this._preview = new NewCard.Preview({ model });
    this.addWidget(this._template);
    this.addWidget(this._preview);
  }
}

export namespace NewCard {
  export interface IOptions {
    model: INewCardModel;
  }

  export class FakeCard extends Card {
    private _newCardModel: INewCardModel;

    constructor(model: ICardModel) {
      super(model);
      this._newCardModel = (model as FakeCardModel).newCardModel;
    }

    getNote(): SCHEMA.Note {
      return this._newCardModel.note as any;
    }

    getCard(): SCHEMA.Card {
      return this._newCardModel.card as any;
    }
  }

  export class Preview extends Panel {
    model: INewCardModel;
    private _card: FakeCard;

    constructor(options: IOptions) {
      super();
      this.model = options.model;
      this.addClass(CSS.newCardPreview);
      this._card = new FakeCard(new FakeCardModel(this.model));
      this.panelLayout.addWidget(this._card);
    }

    get panelLayout() {
      return this.layout as PanelLayout;
    }
  }

  export class Template extends Panel {
    model: INewCardModel;
    private _modelId: number | null;
    private _fields: Field[] = [];

    constructor(options: IOptions) {
      super();
      this.addClass(CSS.newCardTemplate);
      const { model } = options;
      this.model = model;
      model.stateChanged.connect(this.maybeUpdate, this);
      this.updateFields();
    }

    maybeUpdate() {
      if (this._modelId !== this.model.modelId) {
        this._modelId = this.model.modelId || null;
        this.updateFields();
      }
    }

    get panelLayout() {
      return this.layout as PanelLayout;
    }

    updateFields() {
      for (const field of this._fields || []) {
        this.panelLayout.removeWidget(field);
      }
      this._fields = [];

      for (const field of Object.values(this.model.model?.flds || {})) {
        const widget = new Field({ model: this.model, field });
        this._fields.push(widget);
        this.panelLayout.addWidget(widget);
      }
    }
  }

  export class Field extends Panel {
    model: INewCardModel;
    private _editor: CodeEditor.IEditor;
    private _field: SCHEMA.Field;

    constructor(options: IFieldOptions) {
      super();
      this.addClass(CSS.fieldEditor);
      this.model = options.model;
      this._field = options.field;
      const label = document.createElement('label');
      label.textContent = this._field.name;
      this.node.appendChild(label);
      const host = document.createElement('div');
      this.node.appendChild(host);
      this._editor = this.model.createEditor({ host, model: new CodeEditor.Model() });
      this._editor.model.value.changed.connect(() => {
        this.model.setField(this._field.ord, this._editor.model.value.text);
      });
    }

    panelLayout() {
      return this.layout as PanelLayout;
    }
  }

  export interface IFieldOptions extends IOptions {
    field: SCHEMA.Field;
  }
}

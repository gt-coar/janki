// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

import { showDialog, Dialog } from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor } from '@jupyterlab/fileeditor';
import * as React from 'react';

const { cancelButton, okButton } = Dialog;

export async function queryFilePicker(
  candidates: IDocumentWidget<FileEditor>[]
): Promise<IDocumentWidget<FileEditor> | null> {
  let chosen: IDocumentWidget<FileEditor> | null = null;

  try {
    await showDialog({
      title: 'Pick Query File',
      body: (
        <select
          onChange={(change) => {
            chosen = candidates[change.currentTarget.selectedIndex - 1];
          }}
        >
          <option>Unlink</option>
          {candidates.map((c, i) => (
            <option key={c.context.path} value={i}>
              {c.context.path}
            </option>
          ))}
        </select>
      ),
      buttons: [
        cancelButton({ label: 'Cancel', actions: ['reload'] }),
        okButton({ label: 'Link' }),
      ],
      hasClose: true,
    });
  } catch (err) {
    console.log(err);
  }

  return chosen || null;
}

# janki

[![binder-badge][]][binder] [![build][workflow-badge]][workflow]

[binder]: http://mybinder.org/v2/gh/gt-coar/janki/main?urlpath=lab
[binder-badge]: https://mybinder.org/badge_logo.svg
[workflow-badge]:
  https://github.com/gt-coar/janki/workflows/.github/workflows/ci.yml/badge.svg
[workflow]:
  https://github.com/gt-coar/janki/actions?query=branch%3Amain+workflow%3A.github%2Fworkflows%2Fci.yml

## How does it Work?

## Install

```bash
# TBD: pip install janki
```

or

```bash
# TBD: conda install -c conda-forge janki
```

### Development install

See the [contributing guide].

[contributing guide]: https://github.com/gt-coar/janki/blob/main/CONTRIBUTING.md

## Usage

### Get Started

- Launch JupyterLab

```bash
jupyterlab
```

- Open the _Cards_ sidebar
- Try out the example _Deck_ to learn about the topics described here

### Get More _Cards_

When viewing supported document types, the _Cards_ sidebar will show the option to
_Import Cards_.

### Make New _Cards_

#### In Jupyter Notebooks

- When viewing a _Notebook_, click on the _Card_ icon in the _Notebook Toolbar_ to add a
  new _Card\_\_ to that \_Cell_'s metadata

#### In Markdown

> TBD: Markdown can be

#### In PDF

- When viewing a PDF

## Import/Export

> both mechanisms support a `-j/--jmespath` argument, allowing for rich filtering of the
> _Cards_ imported or exported. See the [full CLI documentation][cli-docs].

[jmespath]: https://jmespath.org

- Read _Cards_ from anki2 JSON

```bash
jupyter janki import -i my-janki.anki2.json
```

- Export _Cards_ to anki2 JSON

```bash
jupyter janki export -o my-janki.anki2.json -f anki2
```

[contributing guide]: https://github.com/gt-coar/janki/blob/main/CONTRIBUTING.md

## [cli-docs]: https://janki.rtfd.io/cli

> Copyright (c) 2021 University System of Georgia and janki contributors
>
> Distributed under the terms of the BSD-3-Clause License.

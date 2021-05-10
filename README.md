# janki

> > > ### What is [janki](#janki)?
> > >
> > > ---
> > >
> > > - [ ] a system for mastering complex topics by reviewing topical _Cards_
> > > - [ ] a _JupyterLab_ extension for creating, viewing, and **reviewing**
> > >       _Cards_
> > > - [ ] a _Jupyter Server_ extension for storing _Cards_
> > > - [ ] a _Command Line Interface_ for importing/exporting _Cards_ to other
> > >       formats
> > > - [ ] free software licensed under the [BSD-3-Clause] License

## How does it Work?

## Install

```bash
pip install janki
```

or

```bash
conda install -c conda-forge janki
```

## Usage

### Get Started

- Launch JupyterLab

```bash
jupyterlab
```

- Open the _Cards_ sidebar
- Try out the example _Deck_ to learn about the topics described here

### Get More _Cards_

When viewing supported document types, the _Cards_ sidebar will show the option
to _Import Cards_.

### Make New _Cards_

#### In Jupyter Notebooks

- When viewing a _Notebook_, click on the _Card_ icon in the _Notebook Toolbar_
  to add a new _Card\_\_ to that \_Cell_'s metadata

#### In Markdown

Create a

#### In PDF

- When viewing a PDF

## Import/Export

> both mechanisms support a `-j/--jmespath` argument, allowing for rich
> filtering of the _Cards_ imported or exported. See the

[jmespath]: https://jmespath.org

- Read _Cards_ from anki2 JSON

```bash
jupyter janki import -i my-janki.anki2.json
```

- Export _Cards_ to anki2 JSON

```bash
jupyter janki export -o my-janki.anki2.json -f anki2
```

---

> Copyright (c) 2021 University System of Georgia and janki contributors
>
> Distributed under the terms of the BSD-3-Clause License.

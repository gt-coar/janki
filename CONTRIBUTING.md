# Contributing

> > > ### How can I contribute to janki?
> > >
> > > ---
> > >
> > > - [ ] the documentation for the janki JSON Schema
> > > - [ ] the source-of-truth for the janki JSON Schema
> > > - [ ] an example of a janki Markdown document
> > > - [ ] all of the above

## Get started

- Get and install [Mamabforge]
- Create and activate the development environment

  ```bash
  mamba env update --prefix ./.env --file .binder/environment.yml
  source activate ./.env
  ```

  > remember to activate the environment every time you're working on the code

- See what you can do with [doit]:

  ```bash
  doit list --all --status
  ```

Below are some highlights

## Get to a working JupyterLab with Janki

```bash
doit binder
```

## Watch things

```bash
doit -n4 watch:*
```

> you may prefer to run each `watch` command in a separate terminal

## Prepare for a release

```bash
doit release
```

## Actually release

- Create an _Intent to Release_ issue on GitHub

[mambaforge]: https://github.com/conda-forge/miniforge/releases
[doit]: https://pydoit.org/cmd_run.html

---

> Copyright (c) 2021 University System of Georgia and janki contributors
>
> Distributed under the terms of the BSD-3-Clause License.

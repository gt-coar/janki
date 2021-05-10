---
name: Intent to Release
about: Shepherd a release from planning to shipping
labels: release
---

<!--
Welcome! Before creating a new issue:
* Search for relevant issues
* Follow the issue reporting guidelines:
https://jupyterlab.readthedocs.io/en/latest/getting_started/issue.html
-->

## Blocking Issues/PRs

- [ ] <!-- provide #issue/PR that block this -->

## Checklist

- [ ] start a release issue with a checklist (maybe like this one)
- [ ] ensure the versions have been bumped (check with `doit lint`)
- [ ] validate on binder
- [ ] wait for a successful build of `main`
- [ ] download the `dist` archive and unpack somewhere (maybe a fresh `dist`)
- [ ] create a new release through the GitHub UI
  - [ ] paste in the relevant `CHANGELOG` entries
  - [ ] upload the artifacts
- [ ] actually upload to npm.com, pypi.org
  ```bash
  cd dist
  twine upload janki*
  npm login
  npm publish gt-coar-janki-$VERSION.tgz
  npm logout
  ```
- [ ] postmortem
  - [ ] handle `conda-forge` feedstock tasks
  - [ ] validate on binder via simplest-possible gists
  - [ ] bump to next development version

<!--
Copyright (c) 2021 University System of Georgia and janki contributors
Distributed under the terms of the BSD-3-Clause License.
-->

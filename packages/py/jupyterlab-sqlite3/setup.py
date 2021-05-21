# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import re
from pathlib import Path
import json

import setuptools

HERE = Path(__file__).parent
MOD = "jupyterlab_sqlite3"
MOD_ROOT = HERE / "src" / MOD
EXT = MOD_ROOT / "labextensions"
CORE_NAME = "@gt-coar/jupyterlab-sqlite3"
CORE = EXT / CORE_NAME
PKG_JSON = CORE / "package.json"
PKG = json.loads(PKG_JSON.read_text(encoding="utf-8"))
SHARE = "share/jupyter/labextensions"
INSTALL_JSON = HERE / "install.json"
DATA_FILES = {}

for ext_path in [EXT] + [d for d in EXT.rglob("*") if d.is_dir()]:
    if ext_path == EXT:
        target = SHARE
    else:
        target = f"{SHARE}/{ext_path.relative_to(EXT)}"

    DATA_FILES[target] = [
        dataify(p)
        for p in ext_path.glob("*")
        if not p.is_dir()
    ]

    if ext_path == CORE:
        DATA_FILES[target] += [dataify(INSTALL_JSON)]

SETUP_ARGS = dict(
    name=PKG["jupyterlab"]["discovery"]["server"]["base"]["name"],
    description=PKG["description"],
    version=PKG["version"],
    url=PKG["homepage"],
    license=PKG["license"],
    data_files=[(k, v) for k, v in DATA_FILES.items()],
    project_urls={
        "Bug Tracker": PKG["bugs"]["url"],
        "Source Code": PKG["repository"]["url"]
    },
    author=PKG["author"]["name"],
    author_email=PKG["author"]["email"]
)


if __name__ == "__main__":
    setuptools.setup(**SETUP_ARGS)

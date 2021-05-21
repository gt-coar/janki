# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import json
from pathlib import Path

HERE = Path(__file__).parent
PKG = HERE / "labextensions/@gt-coar/jupyterlab-sqlite3/package.json"

__js__ = json.loads(PKG.read_text(encoding="utf-8"))
__version__ = __js__["version"]

__all__ = ["__version__", "__js__"]

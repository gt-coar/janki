# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import json
from pathlib import Path

from ._version import __js__, __version__


def _jupyter_labextension_paths():
    here = Path(__file__).parent

    exts = []
    for pkg in here.glob("labextensions/*/*/package.json"):
        exts += [
            dict(
                src=str(pkg.parent.relative_to(here).as_posix()),
                dest=json.loads(pkg.read_text(encoding="utf-8"))["name"],
            )
        ]
    return exts


def _jupyter_server_extension_points():
    return [{"module": "janki"}]


def _load_jupyter_server_extension(app):
    from .handlers import add_handlers
    from .manager import JankiManager

    manager = JankiManager(parent=app)
    manager.initialize()
    add_handlers(manager)


# legacy names
load_jupyter_server_extension = _load_jupyter_server_extension
_jupyter_server_extension_paths = _jupyter_server_extension_points

__all__ = [
    "__js__",
    "__version__",
    "_jupyter_labextension_paths",
    "_jupyter_server_extension_paths",
    "_jupyter_server_extension_points",
    "_load_jupyter_server_extension",
    "load_jupyter_server_extension",
]

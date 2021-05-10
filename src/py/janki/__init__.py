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


__all__ = ["__version__", "__js__", "_jupyter_labextension_paths"]

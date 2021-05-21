# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import jupyterlab_sqlite3


def test_version():
    assert jupyterlab_sqlite3.__version__


def test_labextensions():
    assert len(jupyterlab_sqlite3._jupyter_labextension_paths()) == 1

# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import jupyterlab_libarchive


def test_version():
    assert jupyterlab_libarchive.__version__


def test_labextensions():
    assert len(jupyterlab_libarchive._jupyter_labextension_paths()) == 1

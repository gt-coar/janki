# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import janki


def test_version():
    assert janki.__version__


def test_labextensions():
    assert len(janki._jupyter_labextension_paths()) == 3


def test_serverextensions():
    assert len(janki._jupyter_server_extension_points()) == 1


def test_legacyextensions():
    assert len(janki._jupyter_server_extension_paths()) == 1

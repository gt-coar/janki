# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import shutil
from pathlib import Path

import pytest

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures"
# TODO: once packaged, use the one from ankipandas
TEST_COLLECTION = FIXTURES / "collection_v1.anki2"

pytest_plugins = ["jupyter_server.pytest_plugin"]


@pytest.fixture
def jp_server_config(jp_server_config):
    return {
        "ServerApp": {"jpserver_extensions": {"janki": True}},
        "JankiManager": {"strict": True},
    }


@pytest.fixture
def jk_manager(jp_serverapp):
    from ..manager import JankiManager

    return JankiManager(parent=jp_serverapp)


@pytest.fixture
def jk_collection(jp_root_dir):
    """Creates an anki database in the test's home directory."""

    def inner(db_path):
        db_path = jp_root_dir.joinpath(db_path)
        # Check that the notebook has the correct file extension.
        if db_path.suffix != ".anki2":  # pragma: no cover
            raise NotImplementedError("File extension for notebook must be .anki2")
        db_path.parent.mkdir(parents=True, exist_ok=True)
        dest = db_path.parent / db_path.name
        shutil.copy2(TEST_COLLECTION, dest)
        return dest

    return inner

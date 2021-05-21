# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import shutil
import zipfile
from pathlib import Path

import pytest

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures"
# TODO: once packaged, use the one from ankipandas
TEST_COLLECTION = FIXTURES / "collection_v1.anki2"

pytest_plugins = [
    "jupyter_server.pytest_plugin",
]


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
        db_path.parent.mkdir(parents=True, exist_ok=True)

        dest = db_path.parent / db_path.name

        if dest.suffix == ".anki2":
            shutil.copy2(TEST_COLLECTION, dest)
        elif dest.suffix == ".apkg":
            with zipfile.ZipFile(dest, "w") as zip_file:
                with zip_file.open("collection.anki2", "w") as collection:
                    collection.write(TEST_COLLECTION.read_bytes())
        return dest

    return inner

# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import pytest


def test_trait(jp_serverapp, jk_manager):
    assert "janki_manager" in jp_serverapp.trait_names()


@pytest.mark.parametrize("db_path", ["foo.anki2", "foo/bar.anki2"])
async def test_good_collection(db_path, jk_manager, jk_collection, jp_fetch):
    db = jk_collection(db_path)
    assert db.exists()
    response = await jp_fetch("janki", db_path)
    assert response.code == 200

    # TODO: check again with ankipandas >=0.3.11
    # for ext in ["shm", "wal"]:
    #     assert not (db.parent / f"{db.name}-{ext}").exists()

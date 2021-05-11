# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from tornado.concurrent import run_on_executor
from traitlets.config import LoggingConfigurable


class JankiManager(LoggingConfigurable):
    executor = ThreadPoolExecutor(max_workers=1)

    @property
    def root_path(self):
        # TODO: actually use contents manager API, see jupyter-starters
        return Path(self.parent.contents_manager.root_dir)

    @run_on_executor
    def _load(self, path):
        from ankipandas import Collection

        collection = Collection(str(self.root_path / path))

        return {
            "path": path,
            "cards": collection.cards.to_dict(orient="records"),
            "notes": collection.notes.to_dict(orient="records"),
            "revs": collection.revs.to_dict(orient="records"),
        }

    async def load(self, path):
        return await self._load(path)

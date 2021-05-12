# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import jsonschema
from tornado.concurrent import run_on_executor
from traitlets import Bool, Instance, Unicode, default
from traitlets.config import LoggingConfigurable

from .schema import make_validator


class JankiManager(LoggingConfigurable):
    executor = ThreadPoolExecutor(max_workers=1)

    strict = Bool(
        help="apply strict validation to all outputs in addition to inputs"
    ).tag(config=True)

    root_dir = Unicode(
        help="the path which will will be used for resolving collections"
    )

    validator = Instance(jsonschema.Draft7Validator)

    @default("strict")
    def _default_strict(self):  # pragma: no cover
        return self.parent.log_level == "DEBUG"

    @default("root_dir")
    def _default_root_dir(self):
        return self.parent.contents_manager.root_dir

    @default("validator")
    def _default_validator(self):
        return make_validator()

    @property
    def root_path(self):
        # TODO: actually use contents manager API, see jupyter-starters
        return Path(self.root_dir)

    @run_on_executor
    def _load(self, path):
        from ankipandas import Collection

        collection = Collection(str(self.root_path / path))

        result = {}

        try:
            result = {
                "path": path,
                "cards": collection.cards.to_dict(orient="records"),
                "notes": collection.notes.to_dict(orient="records"),
                "revs": collection.revs.to_dict(orient="records"),
            }
        finally:
            del collection

        return result

    async def load(self, path):
        response = await self._load(path)

        self.strict and self.validate(response)

        return response

    def validate(self, response):
        return self.validator.validate(response)

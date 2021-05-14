# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import tempfile
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

    add_self_to_parent = Bool(
        True, help="whether to add the `janki_manager` trait to the parent"
    ).tag(config=True)

    validator = Instance(jsonschema.Draft7Validator)

    @default("strict")
    def _default_strict(self):  # pragma: no cover
        return self.parent.log_level == "DEBUG"

    @default("root_dir")
    def _default_root_dir(self):
        return self.parent.contents_manager.root_dir

    @default("validator")
    def _default_validator(self):
        return make_validator("#/definitions/api-collection")

    @property
    def root_path(self):
        # TODO: actually use contents manager API, see jupyter-starters
        return Path(self.root_dir)

    @run_on_executor
    def _load(self, contents_path):
        """load an ``.anki2`` file (maybe from inside a ``.apkg`` archive)
        TODO: actually use contents_manager API
        """
        full_contents_path = self.root_path / contents_path

        if not full_contents_path.exists():
            raise ValueError(f"{contents_path} not found")

        suffix = full_contents_path.suffix

        if suffix == ".anki2":
            return self._get_api_response(self.root_path / contents_path, contents_path)
        elif suffix == ".apkg":
            import zipp

            zip_path = zipp.Path(str(full_contents_path))

            for member in [*zip_path.iterdir()]:
                self.log_(f"{member.__dict__}")
                if member.name.endswith(".anki2"):
                    with tempfile.TemporaryDirectory() as td:
                        tdp = Path(td)
                        db = tdp / "collection.anki2"
                        db.write_bytes(member.read_bytes())
                        return self._get_api_response(db, contents_path)

        raise ValueError(f"{contents_path} was not recognized")

    def _get_api_response(self, db_path, contents_path):
        from ankipandas import Collection

        collection = Collection(str(db_path))

        result = {}

        try:
            result = {
                "path": contents_path,
                "cards": collection.cards.to_dict(orient="records"),
                "notes": collection.notes.to_dict(orient="records"),
                "revs": collection.revs.to_dict(orient="records"),
            }
        finally:
            del collection

        return result

    @property
    def contents_manager(self):
        return self.parent.contents_manager

    async def load(self, path):
        response = await self._load(path)

        self.strict and self.validate(response)

        return response

    def validate(self, response):
        return self.validator.validate(response)

    def initialize(self):
        self.log_("initializing...")
        if self.add_self_to_parent:
            self.parent.add_traits(
                janki_manager=Instance(JankiManager, default_value=self)
            )

        self.log_("initialized!")

    def log_(self, *args, **kwargs):
        self.log.warning(f"🃏 {args[0]}", *args[1:], **kwargs)

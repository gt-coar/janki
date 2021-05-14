"""janki REST, etc. handlers"""
# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join as ujoin
from tornado.web import authenticated

from .constants import API_NS, RE_EXT


class HandlerBase(APIHandler):
    """common concerns for all our handlers"""

    def initialize(self, manager):
        self.manager = manager


class CollectionHandler(HandlerBase):
    """work with data about a collection. It might be stored in an `.apkg` or `.anki2`"""

    @authenticated
    async def get(self, collection_path, extension):
        response = await self.manager.load(collection_path)
        await self.finish(response)


class PackageHandler(HandlerBase):
    """return the named file from the package"""

    @authenticated
    async def get(self, path):
        response = await self.manager.get_static(path)
        await self.finish(response)


def add_handlers(manager, host_pattern=".*$"):
    """install the janki handlers on the parent's `web_app`"""
    web_app = manager.parent.web_app
    mgr = dict(manager=manager)

    def _u(*bits):
        url = ujoin(web_app.settings["base_url"], *API_NS, *bits)
        manager.log_(url)
        return url

    web_app.add_handlers(
        host_pattern,
        [
            # the collection handler returns schema-constrained
            (_u("collection", f"(.*{RE_EXT})"), CollectionHandler, mgr),
            # serves static HTML, rooted to an apkg
            (_u("package", "(.*)"), PackageHandler, mgr),
        ],
    )

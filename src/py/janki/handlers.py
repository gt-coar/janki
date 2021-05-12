# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from jupyter_server.base.handlers import APIHandler
from tornado.web import authenticated


class HandlerBase(APIHandler):
    def initialize(self, manager):
        self.manager = manager


class CollectionHandler(HandlerBase):
    @authenticated
    async def get(self, path):
        response = await self.manager.load(path)
        await self.finish(response)

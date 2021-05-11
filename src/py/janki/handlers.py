# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from jupyter_server.base.handlers import APIHandler
from tornado.web import authenticated


class HandlerBase(APIHandler):
    def initialize(self, card_manager):
        self.card_manager = card_manager


class CardsHandler(HandlerBase):
    @authenticated
    async def get(self, *bits):
        response = await self.card_manager.all_cards()
        await self.finish(response)

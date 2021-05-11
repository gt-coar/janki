# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from concurrent.futures import ThreadPoolExecutor

from tornado.concurrent import run_on_executor
from traitlets.config import LoggingConfigurable

MAX_WORKERS = 4


class CardManager(LoggingConfigurable):
    executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

    @run_on_executor
    def _all_cards(self):
        try:
            import ankipandas

            self.log.debug(ankipandas)

            has_ankipandas = True
        except:
            has_ankipandas = False

        return {"decks": [], "ankipandas": has_ankipandas}

    async def all_cards(self):
        return await self._all_cards()

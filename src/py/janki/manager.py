# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

from traitlets.config import LoggingConfigurable


class CardManager(LoggingConfigurable):
    async def all_cards(self):
        return {"decks": []}

# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

API_NS = ["janki"]
EXTENSIONS = ["anki2", "apkg"]
RE_EXT = f"\.({'|'.join(EXTENSIONS)})"
TABLE_NAMES = ["cards", "col", "notes", "revlog"]
JSON_FIELDS = dict(col=["conf", "dconf", "decks", "tags", "models"])

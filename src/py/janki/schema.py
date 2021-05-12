# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import json
from pathlib import Path
from typing import Optional, Text

import jsonschema

from ._version import __js__

HERE = Path(__file__).parent
SCHEMA = HERE / "labextensions" / __js__["name"] / "schemas/plugin.json"


def make_validator(ref: Optional[Text] = None) -> jsonschema.Draft7Validator:
    """return a schema from the source-of-truth, with an optional $ref"""
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))

    if ref is not None:
        schema["$ref"] = ref

    return jsonschema.Draft7Validator(schema)

# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import jsonschema
import pytest
from hypothesis import given
from hypothesis_jsonschema import from_schema

from janki.schema import make_validator

validator = make_validator()

not_schema = dict(validator.schema)
_ref = not_schema.pop("$ref")
not_schema["not"] = {"$ref": _ref}


@pytest.mark.parametrize("bad_example", [[None], [False], ["a"], [1]])
def test_validator(bad_example):
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(bad_example)


@given(example=from_schema(validator.schema))
def test_validator_hypothesis(example):
    validator.validate(example)

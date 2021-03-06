# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import jsonschema
import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis_jsonschema import from_schema

from janki.schema import make_validator

validator = make_validator()

schema = dict(**validator.schema)


@pytest.mark.parametrize("bad_example", [[None], [False], ["a"], [1]])
def test_validator(bad_example):
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(bad_example)


@settings(suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much])
@given(example=from_schema(schema))
def test_validator_hypothesis(example):
    validator.validate(example)

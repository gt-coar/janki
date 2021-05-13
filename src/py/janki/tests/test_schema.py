# Copyright (c) 2021 University System of Georgia and janki contributors
# Distributed under the terms of the BSD-3-Clause License.

import jsonschema

# import hypothesis_jsonschema
import pytest


@pytest.mark.parametrize("bad_example", [[None], [False], ["a"], [1]])
def test_validator(bad_example, jk_validator):
    with pytest.raises(jsonschema.ValidationError):
        jk_validator.validate(bad_example)

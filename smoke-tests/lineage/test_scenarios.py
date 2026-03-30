"""
BDD scenario bindings for the lineage smoke tests.

Each scenario in lineage.feature becomes a pytest test case here.
Step definitions live in smoke-tests/conftest.py.

Run with:
  pytest smoke-tests/lineage/ -v
or from the repo root:
  pytest smoke-tests/ -v
"""

from pytest_bdd import scenarios

# Bind every scenario in lineage.feature to a pytest test.
scenarios("lineage.feature")

"""
BDD scenario bindings for the arrows smoke tests.

Each scenario in arrows.feature becomes a pytest test case here.
Step definitions live in smoke-tests/conftest.py.

Run with:
  pytest smoke-tests/arrows/ -v
or from the repo root:
  pytest smoke-tests/ -v
"""

from pytest_bdd import scenarios

# Bind every scenario in arrows.feature to a pytest test.
scenarios("arrows.feature")

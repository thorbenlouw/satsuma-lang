import json
import os
import subprocess

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures")


def run_satsuma_command(cmd: str):
    """
    Expect a satsuma command as if it were run from the shell at the top of the fixtures dir
    """
    split_cmd = cmd.split()
    result = subprocess.run(
        split_cmd,
        capture_output=True,
        text=True,
        check=True,
        cwd=FIXTURES_DIR,
    )
    return result


def test_left_from_leaf():
    """
    Lineage left from a leaf field in a schema should report just the leaf
    """
    cmd = "satsuma lineage --format json --from s1.a lineage/simple.stm"
    data = run_satsuma_command(cmd)

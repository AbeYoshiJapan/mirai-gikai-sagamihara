import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

FIXTURES = Path(__file__).parent / "fixtures"
SNAPSHOTS = Path(__file__).parent / "snapshots"


@pytest.fixture
def fixtures() -> Path:
    return FIXTURES


@pytest.fixture
def snapshots() -> Path:
    return SNAPSHOTS

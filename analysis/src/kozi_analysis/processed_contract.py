from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

from kozi_analysis.paths import REPO_ROOT

ProcessedFileKind = Literal["json", "jsonl"]


@dataclass(frozen=True)
class ProcessedFileSpec:
    name: str
    kind: ProcessedFileKind
    convex_table: str | None
    key_fields: tuple[str, ...]


def _load_contract() -> dict[str, object]:
    contract_path = REPO_ROOT / "lib/data/processed-data-contract.json"
    return json.loads(contract_path.read_text(encoding="utf-8"))


_CONTRACT = _load_contract()

PROCESSED_FILE_SPECS = [
    ProcessedFileSpec(
        name=str(file["name"]),
        kind=file["kind"],
        convex_table=file.get("convexTable"),
        key_fields=tuple(file.get("keyFields", ())),
    )
    for file in _CONTRACT["files"]
    if isinstance(file, dict)
]

APPLICANT_PATHWAY_FIELDS = tuple(
    str(field) for field in _CONTRACT["applicantPathwayFields"]
)

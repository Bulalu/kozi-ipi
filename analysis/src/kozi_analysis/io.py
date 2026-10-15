from __future__ import annotations

import csv
import json
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

TABULAR_SUFFIXES = {".csv", ".json", ".jsonl"}


@dataclass(frozen=True)
class DataFile:
    path: Path
    relative_path: str
    group: str
    suffix: str
    size_bytes: int


def discover_data_files(data_root: Path) -> list[DataFile]:
    files: list[DataFile] = []
    for path in sorted(data_root.rglob("*")):
        if not path.is_file():
            continue
        relative_path = path.relative_to(data_root).as_posix()
        group = (
            relative_path.split("/", maxsplit=1)[0] if "/" in relative_path else "root"
        )
        files.append(
            DataFile(
                path=path,
                relative_path=f"data/{relative_path}",
                group=group,
                suffix=path.suffix.lower(),
                size_bytes=path.stat().st_size,
            )
        )
    return files


def csv_columns(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.reader(file)
        return next(reader, [])


def csv_row_count(path: Path) -> int:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.reader(file)
        next(reader, None)
        return sum(1 for row in reader if any(cell.strip() for cell in row))


def csv_records(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def jsonl_records(path: Path) -> Iterable[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as file:
        for line in file:
            stripped = line.strip()
            if stripped:
                value = json.loads(stripped)
                if isinstance(value, dict):
                    yield value


def json_records(path: Path) -> list[dict[str, Any]]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [value]
    return []

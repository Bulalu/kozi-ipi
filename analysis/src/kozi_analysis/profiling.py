from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from kozi_analysis.io import (
    DataFile,
    csv_columns,
    csv_row_count,
    discover_data_files,
    json_records,
    jsonl_records,
)


@dataclass(frozen=True)
class FileInventory:
    path: str
    group: str
    suffix: str
    size_bytes: int
    row_count: int | None
    column_count: int | None
    columns: list[str]
    notes: list[str]


@dataclass(frozen=True)
class InventoryReport:
    total_files: int
    tabular_files: int
    files_by_group: dict[str, int]
    rows_by_group: dict[str, int]
    columns_by_name: dict[str, int]
    files: list[FileInventory]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def inventory_file(data_file: DataFile) -> FileInventory:
    notes: list[str] = []
    row_count: int | None = None
    columns: list[str] = []

    if data_file.suffix == ".csv":
        columns = csv_columns(data_file.path)
        row_count = csv_row_count(data_file.path)
    elif data_file.suffix == ".jsonl":
        records = list(jsonl_records(data_file.path))
        row_count = len(records)
        columns = sorted({key for record in records for key in record})
    elif data_file.suffix == ".json":
        records = json_records(data_file.path)
        row_count = len(records)
        columns = sorted({key for record in records for key in record})
    else:
        notes.append("non_tabular_file")

    if row_count == 0:
        notes.append("empty_table")
    if data_file.suffix in {".csv", ".json", ".jsonl"} and not columns:
        notes.append("no_columns_detected")

    return FileInventory(
        path=data_file.relative_path,
        group=data_file.group,
        suffix=data_file.suffix,
        size_bytes=data_file.size_bytes,
        row_count=row_count,
        column_count=len(columns) if columns else None,
        columns=columns,
        notes=notes,
    )


def build_inventory(data_root: Path) -> InventoryReport:
    files = [inventory_file(data_file) for data_file in discover_data_files(data_root)]

    files_by_group = Counter(file.group for file in files)
    rows_by_group: defaultdict[str, int] = defaultdict(int)
    columns_by_name: Counter[str] = Counter()

    for file in files:
        if file.row_count is not None:
            rows_by_group[file.group] += file.row_count
        columns_by_name.update(file.columns)

    tabular_files = sum(1 for file in files if file.row_count is not None)

    return InventoryReport(
        total_files=len(files),
        tabular_files=tabular_files,
        files_by_group=dict(sorted(files_by_group.items())),
        rows_by_group=dict(sorted(rows_by_group.items())),
        columns_by_name=dict(sorted(columns_by_name.items())),
        files=files,
    )

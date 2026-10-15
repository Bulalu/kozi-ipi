from pathlib import Path

from kozi_analysis.profiling import build_inventory
from kozi_analysis.reporting import render_inventory_markdown


def test_build_inventory_counts_csv_and_jsonl(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    raw_dir = data_root / "raw"
    processed_dir = data_root / "processed"
    raw_dir.mkdir(parents=True)
    processed_dir.mkdir(parents=True)

    (raw_dir / "institutions.csv").write_text(
        "name,region\nAlpha,Dar es Salaam\nBeta,Arusha\n",
        encoding="utf-8",
    )
    (processed_dir / "programmes.jsonl").write_text(
        '{"programmeName":"A","awardLevel":"degree"}\n'
        '{"programmeName":"B","awardLevel":"certificate"}\n',
        encoding="utf-8",
    )

    report = build_inventory(data_root)

    assert report.total_files == 2
    assert report.tabular_files == 2
    assert report.files_by_group == {"processed": 1, "raw": 1}
    assert report.rows_by_group == {"processed": 2, "raw": 2}
    assert report.columns_by_name["programmeName"] == 1
    assert report.columns_by_name["name"] == 1


def test_render_inventory_markdown_includes_next_prompts(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    raw_dir = data_root / "raw"
    raw_dir.mkdir(parents=True)
    (raw_dir / "programmes.csv").write_text(
        "programme_name,award_level\nMedicine,degree\n",
        encoding="utf-8",
    )

    markdown = render_inventory_markdown(build_inventory(data_root))

    assert "# Data Inventory" in markdown
    assert "`data/raw/programmes.csv`" in markdown
    assert "Next Inspection Prompts" in markdown

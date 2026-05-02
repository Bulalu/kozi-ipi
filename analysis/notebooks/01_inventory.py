import marimo

__generated_with = "0.18.0"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from pathlib import Path
    from typing import Any

    from pydantic import BaseModel, Field

    from kozi_analysis.paths import (
        DATA_ROOT,
        LATEST_REPORTS_ROOT,
        ensure_latest_reports_dir,
        resolve_repo_path,
    )
    from kozi_analysis.profiling import build_inventory
    from kozi_analysis.reporting import (
        render_inventory_markdown,
        write_inventory_report,
    )

    class InventoryParams(BaseModel):
        data_root: str = Field(
            default="data",
            description="Data root, relative to the repository root or absolute.",
        )
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write inventory.md and inventory.json.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> InventoryParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        return InventoryParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/01_inventory.py [options]")
        print()
        for name, field in InventoryParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        DATA_ROOT,
        InventoryParams,
        LATEST_REPORTS_ROOT,
        Path,
        build_inventory,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_inventory_markdown,
        resolve_repo_path,
        write_inventory_report,
    )


@app.cell
def _(InventoryParams, mo, params_from_cli, print_usage):
    if mo.app_meta().mode == "script":
        cli_args = mo.cli_args()
        if "help" in cli_args or "h" in cli_args:
            print_usage()
            raise SystemExit(0)
        params_form = None
        cli_params = params_from_cli(cli_args)
    else:
        cli_params = None
        params_form = (
            mo.md(
                """
            {data_root}
            {report_dir}
            {write_report}
            """
            )
            .batch(
                data_root=mo.ui.text(
                    value="data",
                    label="Data root",
                ),
                report_dir=mo.ui.text(
                    value="analysis/reports/latest",
                    label="Report directory",
                ),
                write_report=mo.ui.switch(
                    value=False,
                    label="Write report",
                ),
            )
            .form()
        )

    return cli_params, params_form


@app.cell
def _(InventoryParams, cli_params, params_form):
    if cli_params is not None:
        params = cli_params
    elif params_form.value is not None:
        params = InventoryParams(**params_form.value)
    else:
        params = InventoryParams()
    return (params,)


@app.cell
def _(mo, params_form):
    (
        mo.vstack([mo.md("# Data Inventory"), params_form])
        if params_form is not None
        else mo.md("# Data Inventory")
    )
    return


@app.cell
def _(build_inventory, params, resolve_repo_path):
    data_root = resolve_repo_path(params.data_root)
    inventory = build_inventory(data_root)
    return data_root, inventory


@app.cell
def _(
    ensure_latest_reports_dir,
    inventory,
    params,
    render_inventory_markdown,
    resolve_repo_path,
    write_inventory_report,
):
    report_dir = resolve_repo_path(params.report_dir)
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            report_dir = ensure_latest_reports_dir()
        write_inventory_report(inventory, report_dir)

    inventory_markdown = render_inventory_markdown(inventory)
    return inventory_markdown, report_dir


@app.cell
def _(inventory, mo, report_dir):
    mo.md(
        f"""
        ## Summary

        - Total files: **{inventory.total_files}**
        - Tabular files: **{inventory.tabular_files}**
        - Report directory: `{report_dir}`
        """
    )
    return


@app.cell
def _(inventory, mo):
    mo.ui.table(
        [
            {
                "group": group,
                "files": inventory.files_by_group[group],
                "rows": inventory.rows_by_group.get(group, 0),
            }
            for group in inventory.files_by_group
        ],
        label="Files by group",
    )
    return


@app.cell
def _(inventory, mo):
    mo.ui.table(
        [
            {
                "path": file.path,
                "rows": file.row_count,
                "columns": file.column_count,
                "notes": ", ".join(file.notes),
            }
            for file in inventory.files
        ],
        label="Inventory files",
    )
    return


@app.cell
def _(inventory_markdown, mo):
    mo.accordion({"Rendered report": mo.md(inventory_markdown)})
    return


if __name__ == "__main__":
    app.run()

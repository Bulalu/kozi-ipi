import marimo

__generated_with = "0.23.4"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from typing import Any

    from pydantic import BaseModel, Field

    from kozi_analysis.overlap import build_source_overlap
    from kozi_analysis.paths import ensure_latest_reports_dir, resolve_repo_path
    from kozi_analysis.reporting import (
        render_source_overlap_markdown,
        write_source_overlap_report,
    )

    class SourceOverlapParams(BaseModel):
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write source-overlap.md and source-overlap.json.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> SourceOverlapParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        return SourceOverlapParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/02_source_overlap.py [options]")
        print()
        for name, field in SourceOverlapParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        SourceOverlapParams,
        build_source_overlap,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_source_overlap_markdown,
        resolve_repo_path,
        write_source_overlap_report,
    )


@app.cell
def _(SourceOverlapParams, mo, params_from_cli, print_usage):
    if mo.app_meta().mode == "script":
        cli_args = mo.cli_args()
        if "help" in cli_args or "h" in cli_args:
            print_usage()
            raise SystemExit(0)
        params_form = None
        params = params_from_cli(cli_args)
    else:
        params_form = (
            mo.md(
                """
            {report_dir}
            {write_report}
            """
            )
            .batch(
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
        params = (
            SourceOverlapParams(**params_form.value)
            if params_form.value is not None
            else SourceOverlapParams()
        )

    return params, params_form


@app.cell
def _(mo, params_form):
    if params_form is not None:
        mo.vstack([mo.md("# Source Overlap"), params_form])
    else:
        mo.md("# Source Overlap")
    return


@app.cell
def _(build_source_overlap, resolve_repo_path):
    repo_root = resolve_repo_path(".")
    source_overlap = build_source_overlap(repo_root)
    return repo_root, source_overlap


@app.cell
def _(
    ensure_latest_reports_dir,
    params,
    render_source_overlap_markdown,
    resolve_repo_path,
    source_overlap,
    write_source_overlap_report,
):
    report_dir = resolve_repo_path(params.report_dir)
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            report_dir = ensure_latest_reports_dir()
        write_source_overlap_report(source_overlap, report_dir)

    source_overlap_markdown = render_source_overlap_markdown(source_overlap)
    return report_dir, source_overlap_markdown


@app.cell
def _(mo, report_dir, source_overlap):
    mo.md(
        f"""
        ## Summary

        - Institution sources: **{len(source_overlap.institution_sources)}**
        - Programme sources: **{len(source_overlap.programme_sources)}**
        - Institution pair comparisons: **{len(source_overlap.institution_overlaps)}**
        - Programme pair comparisons: **{len(source_overlap.programme_overlaps)}**
        - Report directory: `{report_dir}`
        """
    )
    return


@app.cell
def _(mo, source_overlap):
    mo.ui.table(
        [summary.__dict__ for summary in source_overlap.institution_sources],
        label="Institution sources",
    )
    return


@app.cell
def _(mo, source_overlap):
    mo.ui.table(
        [summary.__dict__ for summary in source_overlap.programme_sources],
        label="Programme sources",
    )
    return


@app.cell
def _(mo, source_overlap):
    mo.ui.table(
        [overlap.__dict__ for overlap in source_overlap.institution_overlaps],
        label="Institution pair overlap",
    )
    return


@app.cell
def _(mo, source_overlap):
    mo.ui.table(
        [overlap.__dict__ for overlap in source_overlap.programme_overlaps],
        label="Programme pair overlap",
    )
    return


@app.cell
def _(mo, source_overlap_markdown):
    mo.accordion({"Rendered report": mo.md(source_overlap_markdown)})
    return


if __name__ == "__main__":
    app.run()

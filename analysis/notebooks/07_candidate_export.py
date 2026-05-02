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

    from kozi_analysis.candidate_export import build_candidate_comparison
    from kozi_analysis.paths import (
        REPO_ROOT,
        ensure_latest_reports_dir,
        resolve_repo_path,
    )
    from kozi_analysis.reporting import (
        render_candidate_comparison_markdown,
        write_candidate_comparison_reports,
    )

    class CandidateExportParams(BaseModel):
        candidate_dir: str = Field(
            default="analysis/build/candidate-processed",
            description=(
                "Candidate processed output directory, relative to the repository "
                "root or absolute."
            ),
        )
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        copy_current: bool = Field(
            default=False,
            description=(
                "Copy current data/processed outputs into the candidate directory "
                "before comparison."
            ),
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write candidate-vs-current.md and JSON.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> CandidateExportParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        for key in ["copy_current", "write_report"]:
            if key in normalized:
                normalized[key] = _coerce_bool(normalized[key])
        return CandidateExportParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/07_candidate_export.py [options]")
        print()
        for name, field in CandidateExportParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        CandidateExportParams,
        REPO_ROOT,
        build_candidate_comparison,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_candidate_comparison_markdown,
        resolve_repo_path,
        write_candidate_comparison_reports,
    )


@app.cell
def _(CandidateExportParams, mo, params_from_cli, print_usage):
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
            {candidate_dir}
            {report_dir}
            {copy_current}
            {write_report}
            """
            )
            .batch(
                candidate_dir=mo.ui.text(
                    value="analysis/build/candidate-processed",
                    label="Candidate directory",
                ),
                report_dir=mo.ui.text(
                    value="analysis/reports/latest",
                    label="Report directory",
                ),
                copy_current=mo.ui.switch(
                    value=False,
                    label="Copy current processed files",
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
def _(CandidateExportParams, cli_params, params_form):
    if cli_params is not None:
        params = cli_params
    elif params_form.value is not None:
        params = CandidateExportParams(**params_form.value)
    else:
        params = CandidateExportParams()
    return (params,)


@app.cell
def _(mo, params_form):
    (
        mo.vstack([mo.md("# Candidate Export Comparison"), params_form])
        if params_form is not None
        else mo.md("# Candidate Export Comparison")
    )
    return


@app.cell
def _(REPO_ROOT, build_candidate_comparison, params, resolve_repo_path):
    candidate_dir = resolve_repo_path(params.candidate_dir)
    report_dir = resolve_repo_path(params.report_dir)
    comparison = build_candidate_comparison(
        REPO_ROOT,
        candidate_dir,
        copy_current=params.copy_current,
    )
    return candidate_dir, comparison, report_dir


@app.cell
def _(
    comparison,
    ensure_latest_reports_dir,
    params,
    render_candidate_comparison_markdown,
    report_dir,
    write_candidate_comparison_reports,
):
    output_dir = report_dir
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            output_dir = ensure_latest_reports_dir()
        write_candidate_comparison_reports(comparison, output_dir)

    comparison_markdown = render_candidate_comparison_markdown(comparison)
    return comparison_markdown, output_dir


@app.cell
def _(candidate_dir, comparison, mo, output_dir):
    mo.md(
        f"""
        ## Summary

        - Candidate directory: `{candidate_dir}`
        - Copied files: **{len(comparison.copied_files)}**
        - Files compared: **{len(comparison.files)}**
        - All hashes equal: **{comparison.all_hashes_equal}**
        - Report directory: `{output_dir}`
        """
    )
    return


@app.cell
def _(comparison, mo):
    mo.ui.table(
        [
            {
                "file": file.name,
                "current_exists": file.current_exists,
                "candidate_exists": file.candidate_exists,
                "current_rows": file.current_record_count,
                "candidate_rows": file.candidate_record_count,
                "hashes_equal": file.hashes_equal,
                "fields_equal": file.field_sets_equal,
                "blank_key_count": file.blank_key_count,
                "changed_samples": len(file.changed_record_samples),
            }
            for file in comparison.files
        ],
        label="Candidate vs current contract checks",
    )
    return


@app.cell
def _(comparison_markdown, mo):
    mo.accordion({"Rendered report": mo.md(comparison_markdown)})
    return


if __name__ == "__main__":
    app.run()

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

    from kozi_analysis.aliases import build_alias_report
    from kozi_analysis.paths import ensure_latest_reports_dir, resolve_repo_path
    from kozi_analysis.reporting import render_alias_markdown, write_alias_reports

    class AliasParams(BaseModel):
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        min_score: float = Field(
            default=0.72,
            description="Minimum candidate score to include.",
        )
        max_examples: int = Field(
            default=25,
            description="Maximum candidate examples per source pair.",
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write identity-aliases.md and JSON.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> AliasParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        return AliasParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/03_identity_aliases.py [options]")
        print()
        for name, field in AliasParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        AliasParams,
        build_alias_report,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_alias_markdown,
        resolve_repo_path,
        write_alias_reports,
    )


@app.cell
def _(AliasParams, mo, params_from_cli, print_usage):
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
            {min_score}
            {max_examples}
            {write_report}
            """
            )
            .batch(
                report_dir=mo.ui.text(
                    value="analysis/reports/latest",
                    label="Report directory",
                ),
                min_score=mo.ui.slider(
                    0.5,
                    1.0,
                    value=0.72,
                    step=0.01,
                    label="Minimum score",
                ),
                max_examples=mo.ui.number(
                    value=25,
                    start=5,
                    stop=100,
                    step=5,
                    label="Max examples",
                ),
                write_report=mo.ui.switch(
                    value=False,
                    label="Write report",
                ),
            )
            .form()
        )
        params = (
            AliasParams(**params_form.value)
            if params_form.value is not None
            else AliasParams()
        )

    return params, params_form


@app.cell
def _(mo, params_form):
    if params_form is not None:
        mo.vstack([mo.md("# Identity Aliases"), params_form])
    else:
        mo.md("# Identity Aliases")
    return


@app.cell
def _(build_alias_report, params, resolve_repo_path):
    repo_root = resolve_repo_path(".")
    alias_report = build_alias_report(
        repo_root,
        min_score=params.min_score,
        max_examples=params.max_examples,
    )
    return alias_report, repo_root


@app.cell
def _(
    alias_report,
    ensure_latest_reports_dir,
    params,
    render_alias_markdown,
    resolve_repo_path,
    write_alias_reports,
):
    report_dir = resolve_repo_path(params.report_dir)
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            report_dir = ensure_latest_reports_dir()
        write_alias_reports(alias_report, report_dir)

    alias_markdown = render_alias_markdown(alias_report)
    return alias_markdown, report_dir


@app.cell
def _(alias_report, mo, params, report_dir):
    institution_candidates = sum(
        pair.candidate_count for pair in alias_report.institution_pairs
    )
    programme_candidates = sum(
        pair.candidate_count for pair in alias_report.programme_pairs
    )
    mo.md(
        f"""
        ## Summary

        - Minimum score: **{params.min_score}**
        - Institution source pairs: **{len(alias_report.institution_pairs)}**
        - Programme source pairs: **{len(alias_report.programme_pairs)}**
        - Institution candidate examples: **{institution_candidates}**
        - Programme candidate examples: **{programme_candidates}**
        - Report directory: `{report_dir}`
        """
    )
    return


@app.cell
def _(alias_report, mo):
    mo.ui.table(
        [
            {
                "left_source": pair.left_source,
                "right_source": pair.right_source,
                "left_count": pair.left_count,
                "right_count": pair.right_count,
                "candidates": pair.candidate_count,
                "high_confidence": pair.high_confidence_count,
            }
            for pair in alias_report.institution_pairs
        ],
        label="Institution alias pairs",
    )
    return


@app.cell
def _(alias_report, mo):
    mo.ui.table(
        [
            {
                "left_source": pair.left_source,
                "right_source": pair.right_source,
                "left_count": pair.left_count,
                "right_count": pair.right_count,
                "candidates": pair.candidate_count,
                "high_confidence": pair.high_confidence_count,
            }
            for pair in alias_report.programme_pairs
        ],
        label="Programme alias pairs",
    )
    return


@app.cell
def _(alias_report, mo):
    examples = [
        candidate.__dict__
        for pair in alias_report.institution_pairs + alias_report.programme_pairs
        for candidate in pair.examples
    ]
    mo.ui.table(examples, label="Candidate examples")
    return


@app.cell
def _(alias_markdown, mo):
    mo.accordion({"Rendered report": mo.md(alias_markdown)})
    return


if __name__ == "__main__":
    app.run()

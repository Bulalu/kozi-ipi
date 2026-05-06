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

    from kozi_analysis.features import build_feature_readiness_report
    from kozi_analysis.paths import ensure_latest_reports_dir, resolve_repo_path
    from kozi_analysis.reporting import (
        render_feature_readiness_markdown,
        write_feature_readiness_reports,
    )

    class FeatureReadinessParams(BaseModel):
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        max_examples: int = Field(
            default=8,
            description="Maximum missing examples per weak field.",
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write feature-readiness.md and JSON.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> FeatureReadinessParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        return FeatureReadinessParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/04_feature_readiness.py [options]")
        print()
        for name, field in FeatureReadinessParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        FeatureReadinessParams,
        build_feature_readiness_report,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_feature_readiness_markdown,
        resolve_repo_path,
        write_feature_readiness_reports,
    )


@app.cell
def _(FeatureReadinessParams, mo, params_from_cli, print_usage):
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
            {report_dir}
            {max_examples}
            {write_report}
            """
            )
            .batch(
                report_dir=mo.ui.text(
                    value="analysis/reports/latest",
                    label="Report directory",
                ),
                max_examples=mo.ui.slider(
                    3,
                    20,
                    value=8,
                    step=1,
                    label="Missing examples",
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
def _(FeatureReadinessParams, cli_params, params_form):
    if cli_params is not None:
        params = cli_params
    elif params_form.value is not None:
        params = FeatureReadinessParams(**params_form.value)
    else:
        params = FeatureReadinessParams()
    return (params,)


@app.cell
def _(mo, params_form):
    (
        mo.vstack([mo.md("# Feature Readiness"), params_form])
        if params_form is not None
        else mo.md("# Feature Readiness")
    )
    return


@app.cell
def _(build_feature_readiness_report, params, resolve_repo_path):
    repo_root = resolve_repo_path(".")
    feature_report = build_feature_readiness_report(
        repo_root,
        max_examples=params.max_examples,
    )
    return feature_report, repo_root


@app.cell
def _(
    ensure_latest_reports_dir,
    feature_report,
    params,
    render_feature_readiness_markdown,
    resolve_repo_path,
    write_feature_readiness_reports,
):
    report_dir = resolve_repo_path(params.report_dir)
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            report_dir = ensure_latest_reports_dir()
        write_feature_readiness_reports(feature_report, report_dir)

    feature_markdown = render_feature_readiness_markdown(feature_report)
    return feature_markdown, report_dir


@app.cell
def _(feature_report, mo, report_dir):
    weak_fields = sum(
        1 for coverage in feature_report.field_coverages if coverage.status == "weak"
    )
    mo.md(
        f"""
        ## Summary

        - Areas checked: **{len(feature_report.area_summaries)}**
        - Fields checked: **{len(feature_report.field_coverages)}**
        - Weak fields: **{weak_fields}**
        - Report directory: `{report_dir}`
        """
    )
    return


@app.cell
def _(feature_report, mo):
    mo.ui.table(
        [summary.__dict__ for summary in feature_report.area_summaries],
        label="Area summary",
    )
    return


@app.cell
def _(feature_report, mo):
    mo.ui.table(
        [coverage.__dict__ for coverage in feature_report.field_coverages],
        label="Field coverage",
    )
    return


@app.cell
def _(feature_markdown, mo):
    mo.accordion({"Rendered report": mo.md(feature_markdown)})
    return


if __name__ == "__main__":
    app.run()

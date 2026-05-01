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

    from kozi_analysis.p0_design import build_p0_cleanup_design
    from kozi_analysis.paths import ensure_latest_reports_dir, resolve_repo_path
    from kozi_analysis.reporting import (
        render_p0_cleanup_design_markdown,
        write_p0_cleanup_design_reports,
    )

    class P0CleanupDesignParams(BaseModel):
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write p0-cleanup-design.md and JSON.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> P0CleanupDesignParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        return P0CleanupDesignParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/06_p0_cleanup_design.py [options]")
        print()
        for name, field in P0CleanupDesignParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        P0CleanupDesignParams,
        build_p0_cleanup_design,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_p0_cleanup_design_markdown,
        resolve_repo_path,
        write_p0_cleanup_design_reports,
    )


@app.cell
def _(P0CleanupDesignParams, mo, params_from_cli, print_usage):
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
            P0CleanupDesignParams(**params_form.value)
            if params_form.value is not None
            else P0CleanupDesignParams()
        )

    return params, params_form


@app.cell
def _(mo, params_form):
    if params_form is not None:
        mo.vstack([mo.md("# P0 Cleanup Design"), params_form])
    else:
        mo.md("# P0 Cleanup Design")
    return


@app.cell
def _(build_p0_cleanup_design, params, resolve_repo_path):
    report_dir = resolve_repo_path(params.report_dir)
    p0_design = build_p0_cleanup_design(report_dir)
    return p0_design, report_dir


@app.cell
def _(
    ensure_latest_reports_dir,
    p0_design,
    params,
    render_p0_cleanup_design_markdown,
    report_dir,
    write_p0_cleanup_design_reports,
):
    output_dir = report_dir
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            output_dir = ensure_latest_reports_dir()
        write_p0_cleanup_design_reports(p0_design, output_dir)

    p0_markdown = render_p0_cleanup_design_markdown(p0_design)
    return output_dir, p0_markdown


@app.cell
def _(mo, output_dir, p0_design):
    mo.md(
        f"""
        ## Summary

        - Deterministic identity rule candidates:
          **{len(p0_design.deterministic_identity_rules)}**
        - Manual alias review candidates:
          **{len(p0_design.manual_alias_review_candidates)}**
        - Equivalent Applicant Pathway tasks:
          **{len(p0_design.equivalent_pathway_tasks)}**
        - Report directory: `{output_dir}`
        """
    )
    return


@app.cell
def _(mo, p0_design):
    mo.ui.table(
        [candidate.__dict__ for candidate in p0_design.deterministic_identity_rules],
        label="Deterministic identity rule queue",
    )
    return


@app.cell
def _(mo, p0_design):
    mo.ui.table(
        [candidate.__dict__ for candidate in p0_design.manual_alias_review_candidates],
        label="Manual alias review queue",
    )
    return


@app.cell
def _(mo, p0_design):
    mo.ui.table(
        [task.__dict__ for task in p0_design.equivalent_pathway_tasks],
        label="Equivalent Applicant Pathway tasks",
    )
    return


@app.cell
def _(mo, p0_markdown):
    mo.accordion({"Rendered report": mo.md(p0_markdown)})
    return


if __name__ == "__main__":
    app.run()

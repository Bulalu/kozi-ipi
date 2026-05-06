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

    from kozi_analysis.cleanup import build_cleanup_plan
    from kozi_analysis.paths import ensure_latest_reports_dir, resolve_repo_path
    from kozi_analysis.reporting import (
        render_cleanup_plan_markdown,
        write_cleanup_plan_reports,
    )

    class CleanupPlanParams(BaseModel):
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write cleanup-plan.md and JSON.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> CleanupPlanParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        return CleanupPlanParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/05_cleanup_plan.py [options]")
        print()
        for name, field in CleanupPlanParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        CleanupPlanParams,
        build_cleanup_plan,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_cleanup_plan_markdown,
        resolve_repo_path,
        write_cleanup_plan_reports,
    )


@app.cell
def _(CleanupPlanParams, mo, params_from_cli, print_usage):
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

    return cli_params, params_form


@app.cell
def _(CleanupPlanParams, cli_params, params_form):
    if cli_params is not None:
        params = cli_params
    elif params_form.value is not None:
        params = CleanupPlanParams(**params_form.value)
    else:
        params = CleanupPlanParams()
    return (params,)


@app.cell
def _(mo, params_form):
    (
        mo.vstack([mo.md("# Cleanup Plan"), params_form])
        if params_form is not None
        else mo.md("# Cleanup Plan")
    )
    return


@app.cell
def _(build_cleanup_plan, params, resolve_repo_path):
    report_dir = resolve_repo_path(params.report_dir)
    cleanup_plan = build_cleanup_plan(report_dir)
    return cleanup_plan, report_dir


@app.cell
def _(
    cleanup_plan,
    ensure_latest_reports_dir,
    params,
    render_cleanup_plan_markdown,
    report_dir,
    write_cleanup_plan_reports,
):
    output_dir = report_dir
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            output_dir = ensure_latest_reports_dir()
        write_cleanup_plan_reports(cleanup_plan, output_dir)

    cleanup_markdown = render_cleanup_plan_markdown(cleanup_plan)
    return cleanup_markdown, output_dir


@app.cell
def _(cleanup_plan, mo, output_dir):
    p0_count = sum(1 for task in cleanup_plan.tasks if task.priority == "P0")
    p1_count = sum(1 for task in cleanup_plan.tasks if task.priority == "P1")
    p2_count = sum(1 for task in cleanup_plan.tasks if task.priority == "P2")
    mo.md(
        f"""
        ## Summary

        - Total tasks: **{len(cleanup_plan.tasks)}**
        - P0 tasks: **{p0_count}**
        - P1 tasks: **{p1_count}**
        - P2 tasks: **{p2_count}**
        - Report directory: `{output_dir}`
        """
    )
    return


@app.cell
def _(cleanup_plan, mo):
    mo.ui.table([task.__dict__ for task in cleanup_plan.tasks], label="Cleanup tasks")
    return


@app.cell
def _(cleanup_markdown, mo):
    mo.accordion({"Rendered report": mo.md(cleanup_markdown)})
    return


if __name__ == "__main__":
    app.run()

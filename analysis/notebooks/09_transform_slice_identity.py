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
    from kozi_analysis.candidate_gate import (
        evaluate_candidate_gate,
        load_expected_changes,
    )
    from kozi_analysis.identity_transform import build_identity_transform_slice
    from kozi_analysis.paths import (
        REPO_ROOT,
        ensure_latest_reports_dir,
        resolve_repo_path,
    )
    from kozi_analysis.reporting import (
        render_identity_transform_markdown,
        write_candidate_comparison_reports,
        write_candidate_gate_reports,
        write_identity_transform_reports,
    )

    class IdentityTransformParams(BaseModel):
        candidate_dir: str = Field(
            default="analysis/build/candidate-processed",
            description=(
                "Candidate processed output directory, relative to the repository "
                "root or absolute."
            ),
        )
        expected_changes_path: str = Field(
            default="analysis/config/candidate-gate-expected.json",
            description=(
                "JSON file listing allowed candidate differences with reasons."
            ),
        )
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        copy_current: bool = Field(
            default=True,
            description=(
                "Copy current processed files before Python rewrites "
                "institutions.jsonl."
            ),
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write identity transform and gate reports.",
        )
        fail_on_blockers: bool = Field(
            default=False,
            description="Exit with an error when the candidate gate has blockers.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> IdentityTransformParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        for key in ["copy_current", "write_report", "fail_on_blockers"]:
            if key in normalized:
                normalized[key] = _coerce_bool(normalized[key])
        return IdentityTransformParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/09_transform_slice_identity.py [options]")
        print()
        for name, field in IdentityTransformParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):24s} {field.description}{default}")

    return (
        IdentityTransformParams,
        REPO_ROOT,
        build_candidate_comparison,
        build_identity_transform_slice,
        ensure_latest_reports_dir,
        evaluate_candidate_gate,
        load_expected_changes,
        params_from_cli,
        print_usage,
        render_identity_transform_markdown,
        resolve_repo_path,
        write_candidate_comparison_reports,
        write_candidate_gate_reports,
        write_identity_transform_reports,
    )


@app.cell
def _(IdentityTransformParams, mo, params_from_cli, print_usage):
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
            {candidate_dir}
            {expected_changes_path}
            {report_dir}
            {copy_current}
            {write_report}
            {fail_on_blockers}
            """
            )
            .batch(
                candidate_dir=mo.ui.text(
                    value="analysis/build/candidate-processed",
                    label="Candidate directory",
                ),
                expected_changes_path=mo.ui.text(
                    value="analysis/config/candidate-gate-expected.json",
                    label="Expected changes file",
                ),
                report_dir=mo.ui.text(
                    value="analysis/reports/latest",
                    label="Report directory",
                ),
                copy_current=mo.ui.switch(
                    value=True,
                    label="Copy current processed files",
                ),
                write_report=mo.ui.switch(
                    value=False,
                    label="Write report",
                ),
                fail_on_blockers=mo.ui.switch(
                    value=False,
                    label="Fail on blockers",
                ),
            )
            .form()
        )
        params = (
            IdentityTransformParams(**params_form.value)
            if params_form.value is not None
            else IdentityTransformParams()
        )

    return params, params_form


@app.cell
def _(mo, params_form):
    if params_form is not None:
        mo.vstack([mo.md("# Identity Transform Slice"), params_form])
    else:
        mo.md("# Identity Transform Slice")
    return


@app.cell
def _(
    REPO_ROOT,
    build_candidate_comparison,
    build_identity_transform_slice,
    evaluate_candidate_gate,
    load_expected_changes,
    params,
    resolve_repo_path,
):
    candidate_dir = resolve_repo_path(params.candidate_dir)
    expected_changes_path = resolve_repo_path(params.expected_changes_path)
    report_dir = resolve_repo_path(params.report_dir)
    identity_report = build_identity_transform_slice(
        REPO_ROOT,
        candidate_dir,
        copy_current=params.copy_current,
    )
    comparison = build_candidate_comparison(REPO_ROOT, candidate_dir)
    expected_changes = load_expected_changes(expected_changes_path)
    gate = evaluate_candidate_gate(comparison, expected_changes)
    return (
        candidate_dir,
        comparison,
        expected_changes_path,
        gate,
        identity_report,
        report_dir,
    )


@app.cell
def _(
    comparison,
    ensure_latest_reports_dir,
    gate,
    identity_report,
    params,
    render_identity_transform_markdown,
    report_dir,
    write_candidate_comparison_reports,
    write_candidate_gate_reports,
    write_identity_transform_reports,
):
    output_dir = report_dir
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            output_dir = ensure_latest_reports_dir()
        write_identity_transform_reports(identity_report, output_dir)
        write_candidate_comparison_reports(comparison, output_dir)
        write_candidate_gate_reports(gate, output_dir)

    identity_markdown = render_identity_transform_markdown(identity_report)
    return identity_markdown, output_dir


@app.cell
def _(candidate_dir, expected_changes_path, gate, identity_report, mo, output_dir):
    mo.md(
        f"""
        ## Summary

        - Rewritten files: `{", ".join(identity_report.rewritten_files)}`
        - Input institutions: **{identity_report.input_count}**
        - Output institutions: **{identity_report.output_count}**
        - Blank identity keys: **{identity_report.blank_identity_count}**
        - Duplicate identity rows: **{identity_report.duplicate_identity_count}**
        - Gate passed: **{gate.passed}**
        - Gate blockers: **{gate.blocker_count}**
        - Candidate directory: `{candidate_dir}`
        - Expected changes file: `{expected_changes_path}`
        - Report directory: `{output_dir}`
        """
    )
    return


@app.cell
def _(identity_report, mo):
    mo.ui.table(
        [
            {
                "duplicate_identity": identity,
            }
            for identity in identity_report.duplicate_identity_examples
        ],
        label="Duplicate identity examples",
    )
    return


@app.cell
def _(gate, mo):
    mo.ui.table(
        [
            {
                "status": check.status,
                "file": check.file,
                "check": check.check,
                "expected_reason": check.expected_reason,
            }
            for check in gate.checks
            if check.status != "pass"
        ],
        label="Non-passing gate checks",
    )
    return


@app.cell
def _(identity_markdown, mo):
    mo.accordion({"Rendered report": mo.md(identity_markdown)})
    return


@app.cell
def _(gate, params):
    if params.fail_on_blockers and not gate.passed:
        raise SystemExit(1)
    return


if __name__ == "__main__":
    app.run()

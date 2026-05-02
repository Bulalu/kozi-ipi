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

    from kozi_analysis.data_atlas import bar_chart_html, build_data_atlas_report
    from kozi_analysis.paths import (
        REPO_ROOT,
        ensure_latest_reports_dir,
        resolve_repo_path,
    )
    from kozi_analysis.reporting import (
        render_data_atlas_markdown,
        write_data_atlas_reports,
    )

    class DataAtlasParams(BaseModel):
        report_dir: str = Field(
            default="analysis/reports/latest",
            description=(
                "Report output directory, relative to the repository root or absolute."
            ),
        )
        top_n: int = Field(
            default=12,
            description="Number of rows to show in ranked tables and charts.",
        )
        write_report: bool = Field(
            default=False,
            description="Whether to write data-atlas.md and JSON.",
        )

    def _coerce_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def params_from_cli(raw_args: dict[str, Any]) -> DataAtlasParams:
        normalized = {key.replace("-", "_"): value for key, value in raw_args.items()}
        if "write_report" in normalized:
            normalized["write_report"] = _coerce_bool(normalized["write_report"])
        if "top_n" in normalized:
            normalized["top_n"] = int(normalized["top_n"])
        return DataAtlasParams(**normalized)

    def print_usage() -> None:
        print("Usage: uv run notebooks/10_data_atlas.py [options]")
        print()
        for name, field in DataAtlasParams.model_fields.items():
            default = f" (default: {field.default})"
            print(f"  --{name.replace('_', '-'):16s} {field.description}{default}")

    return (
        DataAtlasParams,
        REPO_ROOT,
        bar_chart_html,
        build_data_atlas_report,
        ensure_latest_reports_dir,
        params_from_cli,
        print_usage,
        render_data_atlas_markdown,
        resolve_repo_path,
        write_data_atlas_reports,
    )


@app.cell
def _(DataAtlasParams, mo, params_from_cli, print_usage):
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
            {top_n}
            {write_report}
            """
            )
            .batch(
                report_dir=mo.ui.text(
                    value="analysis/reports/latest",
                    label="Report directory",
                ),
                top_n=mo.ui.slider(
                    start=5,
                    stop=30,
                    value=12,
                    step=1,
                    label="Rows to show",
                ),
                write_report=mo.ui.switch(
                    value=False,
                    label="Write report",
                ),
            )
            .form()
        )
        params = (
            DataAtlasParams(**params_form.value)
            if params_form.value is not None
            else DataAtlasParams()
        )

    return params, params_form


@app.cell
def _(mo, params_form):
    if params_form is not None:
        mo.vstack([mo.md("# Data Atlas"), params_form])
    else:
        mo.md("# Data Atlas")
    return


@app.cell
def _(REPO_ROOT, build_data_atlas_report, params, resolve_repo_path):
    report_dir = resolve_repo_path(params.report_dir)
    atlas = build_data_atlas_report(REPO_ROOT, top_n=params.top_n)
    return atlas, report_dir


@app.cell
def _(
    atlas,
    ensure_latest_reports_dir,
    params,
    render_data_atlas_markdown,
    report_dir,
    write_data_atlas_reports,
):
    output_dir = report_dir
    if params.write_report:
        if params.report_dir == "analysis/reports/latest":
            output_dir = ensure_latest_reports_dir()
        write_data_atlas_reports(atlas, output_dir)

    atlas_markdown = render_data_atlas_markdown(atlas)
    return atlas_markdown, output_dir


@app.cell
def _(atlas, mo, output_dir):
    campus_like_count = atlas.headline["campus_like_institutions"]
    mo.md(
        f"""
        ## Data Brief

        - Listed institutions/campuses: **{atlas.headline["listed_institutions"]}**
        - Campus/branch-like institution records: **{campus_like_count}**
        - Programmes: **{atlas.headline["programmes"]}**
        - Regions with institution records: **{atlas.headline["regions"]}**
        - Award levels: **{atlas.headline["award_levels"]}**
        - Records needing review: **{atlas.headline["records_needing_review"]}**
        - Report directory: `{output_dir}`

        Campus records are not merged. Counts show listed institution records
        unless stated otherwise.
        """
    )
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [{"source": key, "rows": value} for key, value in atlas.source_counts.items()],
        label="Source caveat",
    )
    return


@app.cell
def _(atlas, bar_chart_html, mo):
    mo.md("## Institution Categories")
    mo.Html(bar_chart_html(atlas.institution_categories))
    return


@app.cell
def _(atlas, bar_chart_html, mo):
    mo.md("## Institution Regions")
    mo.Html(bar_chart_html(atlas.institution_regions))
    return


@app.cell
def _(atlas, bar_chart_html, mo):
    mo.md("## Programme Opportunity Regions")
    mo.Html(bar_chart_html(atlas.programme_regions))
    return


@app.cell
def _(atlas, bar_chart_html, mo):
    mo.md("## Course Categories")
    mo.Html(bar_chart_html(atlas.field_categories))
    return


@app.cell
def _(atlas, bar_chart_html, mo):
    mo.md("## Award Levels")
    mo.Html(bar_chart_html(atlas.award_levels))
    return


@app.cell
def _(atlas, bar_chart_html, mo):
    mo.md("## Applicant Pathways")
    mo.Html(bar_chart_html(atlas.applicant_pathways))
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [row.__dict__ for row in atlas.top_institutions],
        label="Institutions with the most programmes",
    )
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [row.__dict__ for row in atlas.top_institutions_by_category],
        label="Top institutions inside each course category",
    )
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [row.__dict__ for row in atlas.multi_location_parent_groups],
        label="Parent-like groups with multiple campus/location records",
    )
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [row.__dict__ for row in atlas.missing_fields[:24]],
        label="Biggest missing fields",
    )
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [row.__dict__ for row in atlas.review_reasons],
        label="Review risk flags",
    )
    return


@app.cell
def _(atlas, mo):
    mo.md("## Requirements Intensity")
    mo.ui.table(
        [row.__dict__ for row in atlas.high_requirement_programmes],
        label="Highest-scoring programmes",
    )
    return


@app.cell
def _(atlas, mo):
    mo.ui.table(
        [row.__dict__ for row in atlas.institution_requirement_intensity],
        label="Institution average requirements intensity",
    )
    return


@app.cell
def _(atlas_markdown, mo):
    mo.accordion({"Rendered report": mo.md(atlas_markdown)})
    return


if __name__ == "__main__":
    app.run()

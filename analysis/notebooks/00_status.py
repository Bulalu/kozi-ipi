import marimo

__generated_with = "0.23.4"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from kozi_analysis.paths import LATEST_REPORTS_ROOT
    from kozi_analysis.status import build_status_snapshot, progress_bar_html

    snapshot = build_status_snapshot(LATEST_REPORTS_ROOT)
    return progress_bar_html, snapshot


@app.cell
def _(mo, snapshot):
    mo.md(f"""
    # Data Analysis Dashboard

    **Current goal:** {snapshot.current_goal}

    **Current question:** {snapshot.current_question}

    **Short answer:** {snapshot.short_answer}
    """)
    return


@app.cell
def _(mo, snapshot):
    mo.md(
        "\n".join(
            [
                "## What changed",
                "",
                *[
                    f"- `{item['notebook']}`: {item['question']}"
                    for item in snapshot.completed_notebooks
                ],
            ]
        )
    )
    return


@app.cell
def _(mo, progress_bar_html, snapshot):
    mo.md("## Data size")
    mo.Html(progress_bar_html(snapshot.data_counts))
    return


@app.cell
def _(mo, snapshot):
    mo.ui.table(snapshot.source_counts, label="Source comparison coverage")
    return


@app.cell
def _(mo, snapshot):
    if snapshot.alias_counts:
        mo.ui.table(snapshot.alias_counts, label="Alias review queues")
    else:
        mo.md("Alias review queues: not generated yet.")
    return


@app.cell
def _(mo, snapshot):
    if snapshot.feature_counts:
        mo.ui.table(snapshot.feature_counts, label="Feature readiness")
    else:
        mo.md("Feature readiness: not generated yet.")
    return


@app.cell
def _(mo, snapshot):
    if snapshot.cleanup_counts:
        mo.ui.table(snapshot.cleanup_counts, label="Cleanup plan")
    else:
        mo.md("Cleanup plan: not generated yet.")
    return


@app.cell
def _(mo, snapshot):
    if snapshot.p0_design_counts:
        mo.ui.table(snapshot.p0_design_counts, label="P0 cleanup design")
    else:
        mo.md("P0 cleanup design: not generated yet.")
    return


@app.cell
def _(mo, snapshot):
    mo.md(
        "\n".join(
            [
                "## What we learned",
                "",
                *[f"- {finding}" for finding in snapshot.key_findings],
            ]
        )
    )
    return


@app.cell
def _(mo, snapshot):
    mo.md(
        "\n".join(
            [
                "## Why it matters",
                "",
                *[f"- {risk}" for risk in snapshot.risks],
            ]
        )
    )
    return


@app.cell
def _(mo, snapshot):
    mo.md(f"""
    ## Next

    **Next question:** {snapshot.next_question}

    **Next notebook:** `{snapshot.next_notebook}`
    """)
    return


@app.cell
def _(mo, snapshot):
    mo.ui.table(snapshot.completed_notebooks, label="Evidence")
    return


if __name__ == "__main__":
    app.run()

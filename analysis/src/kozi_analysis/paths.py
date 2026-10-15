from pathlib import Path

ANALYSIS_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = ANALYSIS_ROOT.parent
DATA_ROOT = REPO_ROOT / "data"
REPORTS_ROOT = ANALYSIS_ROOT / "reports"
LATEST_REPORTS_ROOT = REPORTS_ROOT / "latest"


def resolve_repo_path(path: str | Path) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return REPO_ROOT / candidate


def ensure_latest_reports_dir() -> Path:
    LATEST_REPORTS_ROOT.mkdir(parents=True, exist_ok=True)
    return LATEST_REPORTS_ROOT

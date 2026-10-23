from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "pipeline/config.json").read_text(encoding="utf-8"))


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def iter_days(start, end):
    current = date.fromisoformat(start)
    while current <= date.fromisoformat(end):
        yield current.isoformat()
        current += timedelta(days=1)


def previous_day(day, day_count=1):
    return (date.fromisoformat(day) - timedelta(days=day_count)).isoformat()


def next_day(day):
    return (date.fromisoformat(day) + timedelta(days=1)).isoformat()


def parse_timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp has no timezone")
    return parsed.astimezone(timezone.utc)


def utc_midnight(day):
    return parse_timestamp(day + "T00:00:00Z")

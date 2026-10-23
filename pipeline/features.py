from collections import defaultdict
from datetime import date
import math

from common import CONFIG, parse_timestamp, previous_day, utc_midnight


def history_days(day, first_seen_day):
    return (date.fromisoformat(day) - date.fromisoformat(max(CONFIG["start"], first_seen_day))).days


def available_series(segments, origin):
    cutoff = utc_midnight(origin)
    series = defaultdict(float)
    for segment in segments:
        if segment["date"] < origin and parse_timestamp(segment["completed_at"]) <= cutoff:
            series[segment["date"], segment["workflow"]] += segment["minutes"]
    return series


def trailing_average(series, day, workflow, day_count, first_seen_day):
    day_count = min(day_count, max(0, history_days(day, first_seen_day)))
    total = sum(series.get((previous_day(day, offset), workflow), 0) for offset in range(1, day_count + 1))
    return total / max(1, day_count)


def build_features(day, workflow, series, first_seen):
    weekday = date.fromisoformat(day).weekday()
    return {
        "workflow": workflow,
        "lag1": series.get((previous_day(day), workflow), 0),
        "lag7": series.get((previous_day(day, 7), workflow), 0),
        "mean7": trailing_average(series, day, workflow, 7, first_seen[workflow]),
        "mean14": trailing_average(series, day, workflow, 14, first_seen[workflow]),
        "weekday_sin": math.sin(2 * math.pi * weekday / 7),
        "weekday_cos": math.cos(2 * math.pi * weekday / 7),
    }

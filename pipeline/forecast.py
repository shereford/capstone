from calendar import monthrange
from datetime import date

from common import CONFIG, iter_days, parse_timestamp, utc_midnight
from features import available_series, build_features, history_days, trailing_average


def month_end(day):
    current = date.fromisoformat(day)
    return current.replace(day=monthrange(current.year, current.month)[1]).isoformat()


def observed_minutes(series, workflow, month_start):
    return sum(
        minutes
        for (day, series_workflow), minutes in series.items()
        if series_workflow == workflow and day >= month_start
    )


def count_known_jobs(jobs, workflow, origin):
    cutoff = utc_midnight(origin)
    return sum(
        1
        for job in jobs
        if job["workflow"] == workflow
        and job["completed_at"]
        and parse_timestamp(job["completed_at"]) <= cutoff
        and job["started_at"]
        and job["started_at"][:10] >= CONFIG["start"]
    )


def summarize_workflow(dataset, origin, workflow, observed, predicted):
    rows = [prediction for prediction in predicted if prediction["workflow"] == workflow]
    return {
        "workflow": workflow,
        "observed": observed,
        "forecast": sum(row["minutes"] for row in rows),
        "baseline": sum(row["baseline_minutes"] for row in rows),
        "history_days": max(0, history_days(origin, dataset["first_seen"][workflow])),
        "history_jobs": count_known_jobs(dataset["jobs"], workflow, origin),
    }


def replay_forecast(model, dataset, origin, through=None):
    first_seen = dataset["first_seen"]
    series = available_series(dataset["segments"], origin)
    workflows = sorted(workflow for workflow, first_day in first_seen.items() if first_day < origin)
    through = through or month_end(origin)
    month_start = through[:8] + "01"
    observed = {workflow: observed_minutes(series, workflow, month_start) for workflow in workflows}
    baseline = {
        workflow: trailing_average(series, origin, workflow, CONFIG["baseline_days"], first_seen[workflow])
        for workflow in workflows
    }

    predicted = []
    for day in iter_days(origin, through):
        feature_rows = [build_features(day, workflow, series, first_seen) for workflow in workflows]
        estimates = [max(0, float(value)) for value in model.predict(feature_rows)]
        for workflow, minutes in zip(workflows, estimates):
            series[day, workflow] = float(minutes)
            if day >= month_start:
                predicted.append(
                    {
                        "date": day,
                        "workflow": workflow,
                        "minutes": float(minutes),
                        "baseline_minutes": baseline[workflow],
                    }
                )

    return {
        "origin": origin,
        "through": through,
        "daily": predicted,
        "workflows": [
            summarize_workflow(dataset, origin, workflow, observed[workflow], predicted) for workflow in workflows
        ],
        "observed": sum(observed.values()),
        "remaining": sum(prediction["minutes"] for prediction in predicted),
        "baseline_remaining": sum(prediction["baseline_minutes"] for prediction in predicted),
    }

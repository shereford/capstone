import math
from statistics import mean

from common import CONFIG, iter_days


def is_test_day(day):
    return CONFIG["test_start"] <= day <= CONFIG["test_end"]


def compute_metrics(rows, prediction):
    errors = [row[prediction] - row["actual"] for row in rows]
    return {
        "mae": mean(abs(error) for error in errors),
        "rmse": math.sqrt(mean(error**2 for error in errors)),
        "mean_error": mean(errors),
        "origins": len(rows),
    }


def build_evaluation_rows(forecasts, actual):
    return [
        {
            "origin": origin,
            "horizon_days": len(list(iter_days(origin, CONFIG["test_end"]))),
            "actual": actual,
            "observed": forecast["observed"],
            "predicted": forecast["observed"] + forecast["remaining"],
            "baseline": forecast["observed"] + forecast["baseline_remaining"],
        }
        for origin, forecast in forecasts.items()
        if origin <= CONFIG["test_end"]
    ]


def build_workflow_diagnostics(forecasts, dataset):
    workflows = sorted(dataset["first_seen"])
    actuals = {
        workflow: sum(
            segment["minutes"]
            for segment in dataset["segments"]
            if is_test_day(segment["date"]) and segment["workflow"] == workflow
        )
        for workflow in workflows
    }
    diagnostics = []
    for origin, forecast in forecasts.items():
        if origin > CONFIG["test_end"]:
            continue

        summaries = {summary["workflow"]: summary for summary in forecast["workflows"]}
        for workflow in workflows:
            summary = summaries.get(workflow, {"observed": 0, "forecast": 0, "baseline": 0})
            diagnostics.append(
                {
                    "origin": origin,
                    "workflow": workflow,
                    "known_at_origin": workflow in summaries,
                    "actual": actuals[workflow],
                    "predicted": summary["observed"] + summary["forecast"],
                    "baseline": summary["observed"] + summary["baseline"],
                }
            )
    return diagnostics


def build_evaluation(forecasts, dataset):
    actual = sum(segment["minutes"] for segment in dataset["segments"] if is_test_day(segment["date"]))
    rows = build_evaluation_rows(forecasts, actual)
    model_metrics, baseline_metrics = compute_metrics(rows, "predicted"), compute_metrics(rows, "baseline")
    return {
        "model": model_metrics,
        "baseline": baseline_metrics,
        "mae_improvement_percent": (
            100 * (baseline_metrics["mae"] - model_metrics["mae"]) / baseline_metrics["mae"]
            if baseline_metrics["mae"]
            else None
        ),
        "hypothesis_supported": model_metrics["mae"] < baseline_metrics["mae"],
        "independent_test_months": 1,
        "rows": rows,
        "workflow_diagnostics": build_workflow_diagnostics(forecasts, dataset),
    }

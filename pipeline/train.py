from collections import defaultdict
import csv
import hashlib
import json

import sklearn
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from common import CONFIG, ROOT, iter_days, next_day, parse_timestamp, previous_day, read_json, utc_midnight, write_json
from evaluate import build_evaluation
from features import available_series, build_features, history_days
from forecast import replay_forecast


def sum_daily_targets(segments):
    cutoff = utc_midnight(CONFIG["test_start"])
    targets = defaultdict(float)
    for segment in segments:
        if parse_timestamp(segment["completed_at"]) <= cutoff:
            targets[segment["date"], segment["workflow"]] += segment["minutes"]
    return targets


def build_training_set(dataset):
    targets = sum_daily_targets(dataset["segments"])
    feature_rows, target_minutes, training_rows = [], [], []
    for day in iter_days(CONFIG["start"], CONFIG["train_end"]):
        series = available_series(dataset["segments"], day)
        for workflow, first_day in sorted(dataset["first_seen"].items()):
            if history_days(day, first_day) < CONFIG["minimum_feature_days"]:
                continue
            features = build_features(day, workflow, series, dataset["first_seen"])
            target = targets[day, workflow]
            feature_rows.append(features)
            target_minutes.append(target)
            training_rows.append({"date": day, **features, "target_minutes": target})

    if not feature_rows or not any(target_minutes):
        raise ValueError("No usable training observations")
    return feature_rows, target_minutes, training_rows


def fit_model(feature_rows, target_minutes):
    model = make_pipeline(DictVectorizer(sparse=False), StandardScaler(), Ridge(alpha=CONFIG["alpha"]))
    model.fit(feature_rows, target_minutes)
    return model


def describe_model(model, training_rows, dataset_path):
    vectorizer, scaler, ridge = [step for _, step in model.steps]
    return {
        "kind": "Shared Ridge regression",
        "alpha": CONFIG["alpha"],
        "train_start": training_rows[0]["date"],
        "train_end": CONFIG["train_end"],
        "training_rows": len(training_rows),
        "training_workflows": len({row["workflow"] for row in training_rows}),
        "features": vectorizer.get_feature_names_out().tolist(),
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "coefficients": ridge.coef_.tolist(),
        "intercept": float(ridge.intercept_),
        "sklearn_version": sklearn.__version__,
        "dataset_sha256": hashlib.sha256(dataset_path.read_bytes()).hexdigest(),
    }


def write_training_rows(training_rows):
    with (ROOT / "data/clean/features.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(training_rows[0]))
        writer.writeheader()
        writer.writerows(training_rows)


def replay_test_forecasts(model, dataset):
    origins = iter_days(CONFIG["test_start"], next_day(CONFIG["end"]))
    forecasts = {origin: replay_forecast(model, dataset, origin) for origin in origins}
    for origin, forecast in forecasts.items():
        week_ago = previous_day(origin, 7)
        if week_ago >= CONFIG["test_start"]:
            forecast["week_ago"] = replay_forecast(model, dataset, week_ago, forecast["through"])
    return forecasts


def main():
    dataset_path = ROOT / "data/dataset.json"
    dataset = read_json(dataset_path)
    feature_rows, target_minutes, training_rows = build_training_set(dataset)
    model = fit_model(feature_rows, target_minutes)
    write_training_rows(training_rows)

    forecasts = replay_test_forecasts(model, dataset)
    evaluation = build_evaluation(forecasts, dataset)
    write_json(ROOT / "data/model.json", describe_model(model, training_rows, dataset_path))
    write_json(ROOT / "data/forecasts.json", forecasts)
    write_json(ROOT / "data/evaluation.json", evaluation)

    excluded = ("rows", "workflow_diagnostics")
    print(json.dumps({key: value for key, value in evaluation.items() if key not in excluded}, indent=2))


if __name__ == "__main__":
    main()

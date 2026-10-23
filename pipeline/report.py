import json

from common import ROOT, read_json


def main():
    evaluation = read_json(ROOT / "data/evaluation.json")
    forecasts = read_json(ROOT / "data/forecasts.json")
    latest = forecasts[max(forecasts)]
    summary = {
        "model": evaluation["model"],
        "baseline": evaluation["baseline"],
        "mae_improvement_percent": evaluation["mae_improvement_percent"],
        "hypothesis_supported": evaluation["hypothesis_supported"],
        "forecast_date": latest["origin"],
        "through": latest["through"],
        "regression_minutes": latest["observed"] + latest["remaining"],
        "baseline_minutes": latest["observed"] + latest["baseline_remaining"],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

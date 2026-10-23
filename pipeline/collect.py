import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from common import CONFIG, iter_days

RUN_FIELDS = "id", "workflow_id", "path", "event", "status", "conclusion", "created_at", "updated_at", "run_attempt"
JOB_FIELDS = "id", "run_id", "run_attempt", "status", "conclusion", "started_at", "completed_at", "labels"
ATTEMPT_FIELDS = "id", "run_attempt", "status", "conclusion", "created_at", "updated_at"


def utc_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def fetch_json(url):
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "c964-capstone",
    }
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    with urlopen(Request(url, headers=headers), timeout=60) as response:
        return json.load(response)


def fetch_pages(base_url, response_key, fields):
    page_records, collected_records, page = [], [], 1
    while True:
        url = f"{base_url}&page={page}"
        response_data = fetch_json(url)
        selected_records = [{field: item.get(field) for field in fields} for item in response_data[response_key]]
        page_records.append(
            {
                "url": url,
                "extracted_at": utc_timestamp(),
                "total_count": response_data["total_count"],
                response_key: selected_records,
            }
        )
        collected_records.extend(selected_records)
        if not selected_records or len(collected_records) >= response_data["total_count"]:
            break
        page += 1
    return page_records, collected_records


def collect_empty_attempts(base_url, run, jobs):
    attempts_with_jobs = {job["run_attempt"] for job in jobs}
    empty_attempts = []
    for attempt in range(1, run["run_attempt"] + 1):
        if attempt in attempts_with_jobs:
            continue
        url = f"{base_url}/{run['id']}/attempts/{attempt}"
        metadata = fetch_json(url)
        extracted_at = utc_timestamp()
        job_pages, attempt_jobs = fetch_pages(f"{url}/jobs?per_page=100", "jobs", JOB_FIELDS)
        if metadata["conclusion"] != "action_required" or attempt_jobs:
            raise ValueError(f"Unresolved missing attempt: {url}")
        empty_attempts.append(
            {
                "url": url,
                "extracted_at": extracted_at,
                "run": {field: metadata[field] for field in ATTEMPT_FIELDS},
                "job_pages": job_pages,
            }
        )
    return empty_attempts


def collect_day(day):
    base_url = f"https://api.github.com/repos/{CONFIG['repository']}/actions/runs"
    run_pages, runs = fetch_pages(f"{base_url}?created={day}..{day}&per_page=30", "workflow_runs", RUN_FIELDS)
    job_pages, empty_attempts = [], []
    for run in runs:
        run_job_pages, jobs = fetch_pages(f"{base_url}/{run['id']}/jobs?filter=all&per_page=100", "jobs", JOB_FIELDS)
        job_pages.extend(run_job_pages)
        if jobs:
            empty_attempts.extend(collect_empty_attempts(base_url, run, jobs))
    record = {
        "repository": CONFIG["repository"],
        "run_created_date": day,
        "run_pages": run_pages,
        "job_pages": job_pages,
    }
    if empty_attempts:
        record["empty_attempts"] = empty_attempts
    return record


def main():
    parser = argparse.ArgumentParser(description="Collect GitHub Actions runs and jobs for the configured repository.")
    parser.add_argument("--output", type=Path, required=True, help="Output directory. Existing days are skipped.")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    for day in iter_days(CONFIG["collection_start"], CONFIG["end"]):
        destination = args.output / f"{day}.json"
        if destination.exists():
            print(f"Skipping {day}, already saved", flush=True)
            continue

        record = collect_day(day)
        destination.write_text(json.dumps(record, separators=(",", ":")) + "\n", encoding="utf-8")
        runs = sum(len(page["workflow_runs"]) for page in record["run_pages"])
        print(f"{day}: {runs} runs saved", flush=True)


if __name__ == "__main__":
    main()

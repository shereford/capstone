from collections import defaultdict
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import json

from common import CONFIG, ROOT, iter_days, parse_timestamp, write_json


def normalize_job(job, run):
    for key in ("id", "run_id", "run_attempt"):
        if type(job.get(key)) is not int or job[key] < 1:
            raise ValueError(f"Invalid job {key}")
    if job["run_id"] != run["id"] or job["status"] != "completed":
        raise ValueError("Mismatched run or unfinished job")

    skipped = job["conclusion"] == "skipped"
    start = parse_timestamp(job["started_at"]) if job.get("started_at") else None
    end = parse_timestamp(job["completed_at"]) if job.get("completed_at") else None
    if not skipped and (not start or not end or end < start):
        raise ValueError("Invalid executed-job timestamps")

    seconds = 0 if skipped else (end - start).total_seconds()
    return {
        "id": job["id"],
        "run_id": job["run_id"],
        "attempt": job["run_attempt"],
        "workflow": run["path"],
        "event": run["event"],
        "conclusion": job["conclusion"],
        "started_at": start.isoformat() if start else None,
        "completed_at": end.isoformat() if end else None,
        "minutes": seconds / 60,
    }


def split_at_utc_midnight(job):
    if job["minutes"] == 0:
        return []

    current, end = parse_timestamp(job["started_at"]), parse_timestamp(job["completed_at"])
    segments = []
    while current < end:
        boundary = datetime.combine(current.date() + timedelta(days=1), datetime.min.time(), timezone.utc)
        stop = min(end, boundary)
        segments.append(
            {
                "date": str(current.date()),
                "workflow": job["workflow"],
                "job_id": job["id"],
                "completed_at": job["completed_at"],
                "minutes": (stop - current).total_seconds() / 60,
            }
        )
        current = stop
    return segments


def load_raw_days():
    raw_days, raw_hashes = [], {}
    for day in iter_days(CONFIG["collection_start"], CONFIG["end"]):
        path = ROOT / "data/raw" / f"{day}.json"
        raw_bytes = path.read_bytes()
        raw_hashes[str(path.relative_to(ROOT)).replace("\\", "/")] = hashlib.sha256(raw_bytes).hexdigest()
        raw_days.append(json.loads(raw_bytes))
    return raw_days, raw_hashes


def index_by_id(raw_days, page_key, record_key):
    return {record["id"]: record for raw in raw_days for page in raw[page_key] for record in page[record_key]}


def list_extraction_times(raw_days):
    times = []
    for raw in raw_days:
        for attempt in raw.get("empty_attempts", []):
            times.extend(page["extracted_at"] for page in [attempt] + attempt["job_pages"])
        times.extend(page["extracted_at"] for page in raw["run_pages"] + raw["job_pages"])
    return times


def normalize_jobs(jobs_by_id, runs_by_id):
    clean_jobs, rejected_jobs = [], []
    for job in sorted(jobs_by_id.values(), key=lambda job: job["id"]):
        try:
            clean_jobs.append(normalize_job(job, runs_by_id[job["run_id"]]))
        except (ValueError, TypeError, KeyError) as error:
            rejected_jobs.append({"job_id": job.get("id"), "reason": str(error)})
    return clean_jobs, rejected_jobs


def write_csv_tables(clean_jobs, daily_segments):
    with (ROOT / "data/clean/jobs.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(clean_jobs[0]))
        writer.writeheader()
        writer.writerows(clean_jobs)

    daily_minutes = defaultdict(float)
    for segment in daily_segments:
        daily_minutes[segment["date"], segment["workflow"]] += segment["minutes"]
    with (ROOT / "data/clean/daily.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["date", "workflow", "minutes"])
        writer.writerows((day, workflow, value) for (day, workflow), value in sorted(daily_minutes.items()))


def count_skipped_negative_timestamps(jobs_by_id):
    return sum(
        job["conclusion"] == "skipped"
        and job.get("started_at") is not None
        and job.get("completed_at") is not None
        and parse_timestamp(job["completed_at"]) < parse_timestamp(job["started_at"])
        for job in jobs_by_id.values()
    )


def build_manifest(raw_days, raw_hashes, runs_by_id, jobs_by_id, clean_jobs, daily_segments):
    extraction_times = list_extraction_times(raw_days)
    raw_job_count = sum(len(page["jobs"]) for raw in raw_days for page in raw["job_pages"])
    return {
        **CONFIG,
        "extraction_start": min(extraction_times),
        "extraction_end": max(extraction_times),
        "raw_days": len(raw_days),
        "runs": len(runs_by_id),
        "attempts": sum(run["run_attempt"] for run in runs_by_id.values()),
        "jobs": len(clean_jobs),
        "workflows": len({run["path"] for run in runs_by_id.values()}),
        "verified_empty_attempts": sum(len(raw.get("empty_attempts", [])) for raw in raw_days),
        "minutes": sum(segment["minutes"] for segment in daily_segments),
        "duplicate_jobs_removed": raw_job_count - len(jobs_by_id),
        "skipped_jobs": sum(job["conclusion"] == "skipped" for job in clean_jobs),
        "skipped_negative_timestamps": count_skipped_negative_timestamps(jobs_by_id),
        "rerun_minutes": sum(
            segment["minutes"] for segment in daily_segments if jobs_by_id[segment["job_id"]]["run_attempt"] > 1
        ),
        "cross_midnight_jobs": sum(len(split_at_utc_midnight(job)) > 1 for job in clean_jobs),
        "sha256": raw_hashes,
    }


def find_first_seen(runs_by_id):
    first_seen = {}
    for run in runs_by_id.values():
        first_seen[run["path"]] = min(first_seen.get(run["path"], run["created_at"][:10]), run["created_at"][:10])
    return first_seen


def main():
    raw_days, raw_hashes = load_raw_days()
    runs_by_id = index_by_id(raw_days, "run_pages", "workflow_runs")
    jobs_by_id = index_by_id(raw_days, "job_pages", "jobs")
    clean_jobs, rejected_jobs = normalize_jobs(jobs_by_id, runs_by_id)
    write_json(ROOT / "data/clean/rejected.json", rejected_jobs)
    if rejected_jobs:
        raise ValueError(f"{len(rejected_jobs)} rejected jobs, see data/clean/rejected.json")
    if not clean_jobs:
        raise ValueError("No jobs in snapshot")

    daily_segments = [
        segment
        for job in clean_jobs
        for segment in split_at_utc_midnight(job)
        if CONFIG["start"] <= segment["date"] <= CONFIG["end"]
    ]
    write_csv_tables(clean_jobs, daily_segments)

    manifest = build_manifest(raw_days, raw_hashes, runs_by_id, jobs_by_id, clean_jobs, daily_segments)
    dataset = {
        "manifest": manifest,
        "first_seen": find_first_seen(runs_by_id),
        "jobs": clean_jobs,
        "segments": daily_segments,
    }
    write_json(ROOT / "data/dataset.json", dataset)
    write_json(ROOT / "data/manifest.json", manifest)
    print(json.dumps({key: value for key, value in manifest.items() if key != "sha256"}, indent=2))


if __name__ == "__main__":
    main()

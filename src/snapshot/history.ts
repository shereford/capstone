import type {
  DashboardQuery,
  HistogramBucket,
  HistorySummary,
  Job,
  Segment,
  Snapshot,
  WorkflowMinutes,
} from '../types';
import { matchesWorkflow, median, sumBy } from './util';

const HISTOGRAM_BUCKETS = [
  { bucket: '<1 min', min: 0, max: 1 },
  { bucket: '1-5', min: 1, max: 5 },
  { bucket: '5-15', min: 5, max: 15 },
  { bucket: '15-30', min: 15, max: 30 },
  { bucket: '30-60', min: 30, max: 60 },
  { bucket: '60+', min: 60, max: Infinity },
];

export function summarizeHistory(snapshot: Snapshot, query: DashboardQuery): HistorySummary {
  const segments = snapshot.dataset.segments.filter(
    segment =>
      matchesWorkflow(query.workflow, segment.workflow) &&
      isKnownAt(segment, query.origin) &&
      segment.date >= query.start &&
      segment.date <= query.end,
  );
  const jobs = snapshot.dataset.jobs.filter(
    job => matchesWorkflow(query.workflow, job.workflow) && isCompletedInRange(job, query),
  );
  const jobsById = new Map(snapshot.dataset.jobs.map(job => [job.id, job]));
  const jobIds = new Set(segments.map(segment => segment.job_id));
  const rerunSegments = segments.filter(segment => jobsById.get(segment.job_id)!.attempt > 1);

  return {
    minutes: sumBy(segments, segment => segment.minutes),
    jobs: jobIds.size,
    runs: new Set([...jobIds].map(id => jobsById.get(id)!.run_id)).size,
    rerunMinutes: sumBy(rerunSegments, segment => segment.minutes),
    medianDuration: median(jobs.map(job => job.minutes)),
    workflows: sumMinutesByWorkflow(segments),
    histogram: countByDuration(jobs),
  };
}

function isKnownAt(segment: Segment, origin: string) {
  return segment.date < origin && Date.parse(segment.completed_at) <= Date.parse(origin);
}

function isCompletedInRange(job: Job, query: DashboardQuery) {
  if (!job.started_at || !job.completed_at || job.minutes <= 0) {
    return false;
  }

  const startDate = job.started_at.slice(0, 10);
  return Date.parse(job.completed_at) <= Date.parse(query.origin) && startDate >= query.start && startDate <= query.end;
}

function sumMinutesByWorkflow(segments: Segment[]): WorkflowMinutes[] {
  const totals = new Map<string, number>();
  for (const segment of segments) {
    totals.set(segment.workflow, (totals.get(segment.workflow) ?? 0) + segment.minutes);
  }
  return [...totals].map(([workflow, minutes]) => ({ workflow, minutes })).sort((a, b) => b.minutes - a.minutes);
}

function countByDuration(jobs: Job[]): HistogramBucket[] {
  return HISTOGRAM_BUCKETS.map(({ bucket, min, max }) => ({
    bucket,
    count: jobs.filter(job => job.minutes >= min && job.minutes < max).length,
  }));
}

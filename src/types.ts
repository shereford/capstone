export interface Job {
  id: number;
  run_id: number;
  attempt: number;
  workflow: string;
  event: string;
  conclusion: string;
  started_at: string | null;
  completed_at: string | null;
  minutes: number;
}

export interface Segment {
  date: string;
  workflow: string;
  job_id: number;
  completed_at: string;
  minutes: number;
}

export interface Manifest {
  repository: string;
  start: string;
  end: string;
  collection_start: string;
  test_start: string;
  train_end: string;
  baseline_days: number;
  extraction_start: string;
  extraction_end: string;
  raw_days: number;
  runs: number;
  attempts: number;
  jobs: number;
  workflows: number;
  minutes: number;
  rerun_minutes: number;
  cross_midnight_jobs: number;
  skipped_jobs: number;
  skipped_negative_timestamps: number;
  duplicate_jobs_removed: number;
  sha256: Record<string, string>;
}

export interface Dataset {
  manifest: Manifest;
  first_seen: Record<string, string>;
  jobs: Job[];
  segments: Segment[];
}

export interface WorkflowForecast {
  workflow: string;
  observed: number;
  forecast: number;
  baseline: number;
  history_days: number;
  history_jobs: number;
}

export interface ForecastDay {
  date: string;
  workflow: string;
  minutes: number;
  baseline_minutes: number;
}

export interface Forecast {
  origin: string;
  through: string;
  observed: number;
  remaining: number;
  baseline_remaining: number;
  daily: ForecastDay[];
  workflows: WorkflowForecast[];
  week_ago?: Forecast;
}

export interface Metrics {
  mae: number;
  rmse: number;
  mean_error: number;
  origins: number;
}

export interface EvaluationRow {
  origin: string;
  horizon_days: number;
  actual: number;
  observed: number;
  predicted: number;
  baseline: number;
}

export interface Evaluation {
  hypothesis_supported: boolean;
  model: Metrics;
  baseline: Metrics;
  mae_improvement_percent: number | null;
  independent_test_months: number;
  rows: EvaluationRow[];
}

export interface Metadata {
  manifest: Manifest;
  workflows: string[];
  origins: string[];
  evaluation: Evaluation;
}

export interface Snapshot {
  dataset: Dataset;
  forecasts: Record<string, Forecast>;
  metadata: Metadata;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface DashboardQuery extends DateRange {
  origin: string;
  workflow: string;
}

export interface TrajectoryPoint {
  date: string;
  actual?: number;
  predicted?: number;
  baseline?: number;
  previous?: number;
}

export interface ForecastSummary {
  total: number;
  baselineTotal: number;
  actualTotal: number;
  actualThrough: string;
  previousOrigin?: string;
  workflows: WorkflowForecast[];
}

export interface WorkflowMinutes {
  workflow: string;
  minutes: number;
}

export interface HistogramBucket {
  bucket: string;
  count: number;
}

export interface HistorySummary {
  minutes: number;
  jobs: number;
  runs: number;
  rerunMinutes: number;
  medianDuration: number;
  workflows: WorkflowMinutes[];
  histogram: HistogramBucket[];
}

export interface DashboardData {
  forecast: ForecastSummary;
  trajectory: TrajectoryPoint[];
  historical: HistorySummary;
}

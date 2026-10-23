import datasetUrl from '../../data/dataset.json?url';
import forecastsUrl from '../../data/forecasts.json?url';
import evaluationUrl from '../../data/evaluation.json?url';
import type { Dataset, Evaluation, Forecast, Metadata, Snapshot } from '../types';

export async function loadSnapshot(signal?: AbortSignal): Promise<Snapshot> {
  const [dataset, forecasts, evaluation] = await Promise.all([
    fetchJson<Dataset>(datasetUrl, signal),
    fetchJson<Record<string, Forecast>>(forecastsUrl, signal),
    fetchJson<Evaluation>(evaluationUrl, signal),
  ]);
  validateSnapshot(dataset, forecasts, evaluation);

  const metadata: Metadata = {
    manifest: dataset.manifest,
    workflows: Object.keys(dataset.first_seen).sort(),
    origins: Object.keys(forecasts).sort(),
    evaluation,
  };
  console.info('Snapshot loaded', {
    through: dataset.manifest.end,
    jobs: dataset.jobs.length,
    forecasts: metadata.origins.length,
  });
  return { dataset, forecasts, metadata };
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

function validateSnapshot(dataset: Dataset, forecasts: Record<string, Forecast>, evaluation: Evaluation) {
  if (!dataset.jobs.length || !Object.keys(forecasts).length || !Number.isFinite(evaluation.model.mae)) {
    throw new Error('Invalid saved dataset or evaluation');
  }

  for (const row of [...dataset.jobs, ...dataset.segments]) {
    if (!Number.isFinite(row.minutes) || row.minutes < 0) {
      throw new Error('Invalid execution minutes in dataset');
    }
  }
}

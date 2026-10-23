import { ALL_WORKFLOWS } from '../constants';
import { isIsoDate, previousDate } from '../dates';
import type { DashboardData, DashboardQuery, Snapshot } from '../types';
import { summarizeHistory } from './history';
import { buildTrajectory } from './trajectory';
import { matchesWorkflow, sumBy } from './util';

export function queryDashboard(snapshot: Snapshot, request: Partial<DashboardQuery>): DashboardData {
  const query = resolveQuery(snapshot, request);
  const forecast = snapshot.forecasts[query.origin];
  const workflows = forecast.workflows.filter(row => matchesWorkflow(query.workflow, row.workflow));
  const observed = sumBy(workflows, row => row.observed);
  const trajectory = buildTrajectory(snapshot, query, observed);

  return {
    forecast: {
      total: observed + sumBy(workflows, row => row.forecast),
      baselineTotal: observed + sumBy(workflows, row => row.baseline),
      actualTotal: trajectory.actualTotal,
      actualThrough: trajectory.actualThrough,
      previousOrigin: forecast.week_ago?.origin,
      workflows,
    },
    trajectory: trajectory.points,
    historical: summarizeHistory(snapshot, query),
  };
}

function resolveQuery(snapshot: Snapshot, request: Partial<DashboardQuery>): DashboardQuery {
  const { manifest, origins, workflows } = snapshot.metadata;
  const origin = request.origin ?? origins.at(-1)!;
  if (!origins.includes(origin)) {
    throw new Error(`Unknown forecast date ${origin}`);
  }

  const start = request.start ?? manifest.start;
  const end = request.end ?? previousDate(origin);
  const isValidRange =
    [start, end].every(isIsoDate) && start >= manifest.start && end <= manifest.end && start <= end && end < origin;
  if (!isValidRange) {
    throw new Error(`Invalid history range ${start} to ${end}`);
  }

  const workflow = request.workflow ?? ALL_WORKFLOWS;
  if (workflow !== ALL_WORKFLOWS && !workflows.includes(workflow)) {
    throw new Error(`Unknown workflow ${workflow}`);
  }

  return { origin, start, end, workflow };
}

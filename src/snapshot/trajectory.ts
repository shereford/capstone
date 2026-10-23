import { DAY_MS, toIsoDate } from '../dates';
import type { DashboardQuery, ForecastDay, Snapshot, TrajectoryPoint } from '../types';
import { matchesWorkflow, sumBy } from './util';

interface Trajectory {
  points: TrajectoryPoint[];
  actualTotal: number;
  actualThrough: string;
}

export function buildTrajectory(snapshot: Snapshot, query: DashboardQuery, observed: number): Trajectory {
  const forecast = snapshot.forecasts[query.origin];
  const previousForecast = forecast.week_ago;
  const monthStart = `${query.origin.slice(0, 8)}01`;
  const actualThrough = [forecast.through, snapshot.dataset.manifest.end].sort()[0];
  // Actuals after the forecast date are only shown for comparison
  const actualByDate = sumActualsByDate(snapshot, query.workflow, monthStart, actualThrough);
  const forecastStart = Date.parse(query.origin) - DAY_MS;
  const points: TrajectoryPoint[] = [];
  let actual = 0;
  let predicted = observed;
  let baseline = observed;
  let previous = previousForecast
    ? sumBy(
        previousForecast.workflows.filter(row => matchesWorkflow(query.workflow, row.workflow)),
        row => row.observed,
      )
    : 0;

  for (let time = Date.parse(monthStart) - DAY_MS; time <= Date.parse(forecast.through); time += DAY_MS) {
    const date = toIsoDate(time);
    const point: TrajectoryPoint = { date };

    if (date <= actualThrough) {
      actual += actualByDate.get(date) ?? 0;
      point.actual = actual;
    }

    if (time >= forecastStart) {
      const rows = selectDay(forecast.daily, date, query.workflow);
      predicted += sumBy(rows, row => row.minutes);
      baseline += sumBy(rows, row => row.baseline_minutes);
      point.predicted = predicted;
      point.baseline = baseline;
    }

    if (previousForecast && time >= Date.parse(previousForecast.origin) - DAY_MS) {
      previous += sumBy(selectDay(previousForecast.daily, date, query.workflow), row => row.minutes);
      point.previous = previous;
    }

    points.push(point);
  }

  return { points, actualTotal: actual, actualThrough };
}

function sumActualsByDate(snapshot: Snapshot, workflow: string, monthStart: string, actualThrough: string) {
  const totals = new Map<string, number>();
  for (const segment of snapshot.dataset.segments) {
    const isInMonth = segment.date >= monthStart && segment.date <= actualThrough;
    if (isInMonth && matchesWorkflow(workflow, segment.workflow)) {
      totals.set(segment.date, (totals.get(segment.date) ?? 0) + segment.minutes);
    }
  }
  return totals;
}

function selectDay(rows: ForecastDay[], date: string, workflow: string) {
  return rows.filter(row => row.date === date && matchesWorkflow(workflow, row.workflow));
}

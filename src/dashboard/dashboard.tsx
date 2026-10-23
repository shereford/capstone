import { useEffect, useMemo, useState } from 'react';
import { Container, Loader, Stack, Text, Title } from '@mantine/core';
import { ALL_WORKFLOWS } from '../constants';
import { previousDate } from '../dates';
import { loadSnapshot } from '../snapshot/load-snapshot';
import { queryDashboard } from '../snapshot/query-dashboard';
import type { DashboardData, DashboardQuery, DateRange, Snapshot } from '../types';
import { EvaluationTable } from './evaluation-table';
import { ForecastControls } from './forecast-controls';
import { ForecastTotals } from './forecast-totals';
import { HistoryCharts } from './history-charts';
import { HistoryFilters } from './history-filters';
import { TrajectoryChart } from './trajectory-chart';
import { WorkflowTable } from './workflow-table';

interface QueryResult {
  data?: DashboardData;
  error?: string;
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [loadError, setLoadError] = useState('');
  const [forecastDate, setForecastDate] = useState('');
  const [workflow, setWorkflow] = useState<string>(ALL_WORKFLOWS);
  const [historyRange, setHistoryRange] = useState<DateRange>({ start: '', end: '' });
  const metadata = snapshot?.metadata;

  useEffect(() => {
    const abort = new AbortController();
    loadSnapshot(abort.signal)
      .then(loaded => {
        const latest = loaded.metadata.origins.at(-1)!;
        setForecastDate(latest);
        setHistoryRange({ start: loaded.metadata.manifest.start, end: previousDate(latest) });
        setSnapshot(loaded);
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          setLoadError(error.message);
        }
      });
    return () => abort.abort();
  }, []);

  const result = useMemo(
    () => runQuery(snapshot, { origin: forecastDate, workflow, ...historyRange }),
    [snapshot, forecastDate, workflow, historyRange],
  );
  const data = result.data;
  const error = loadError || result.error;
  const loading = !snapshot && !loadError;

  const changeForecastDate = (value: string | null) => {
    if (!value || !metadata) {
      return;
    }
    setForecastDate(value);
    setHistoryRange(clampHistoryRange(historyRange, value, metadata.manifest.start));
  };

  return (
    <Container size="lg" py="md">
      <Stack>
        <Title order={1}>Seth Hereford - C964 Capstone</Title>
        {metadata && (
          <ForecastControls
            origins={metadata.origins}
            workflows={metadata.workflows}
            forecastDate={forecastDate}
            workflow={workflow}
            onForecastDateChange={changeForecastDate}
            onWorkflowChange={setWorkflow}
          />
        )}
        {loading && <Loader size="sm" aria-label="Loading" />}
        {error && (
          <Text c="red" role="alert">
            {error}
          </Text>
        )}
        {data && metadata && !error && (
          <Stack>
            {data.forecast.workflows.length ? (
              <>
                <ForecastTotals forecast={data.forecast} baselineDays={metadata.manifest.baseline_days} />
                <TrajectoryChart
                  points={data.trajectory}
                  forecastDate={forecastDate}
                  previousOrigin={data.forecast.previousOrigin}
                  baselineDays={metadata.manifest.baseline_days}
                />
                <WorkflowTable workflows={data.forecast.workflows} />
              </>
            ) : (
              <Text>No workflow history before this date.</Text>
            )}
            <HistoryFilters
              key={forecastDate}
              range={historyRange}
              firstDate={metadata.manifest.start}
              lastDate={previousDate(forecastDate)}
              onApply={setHistoryRange}
            />
            <HistoryCharts history={data.historical} />
          </Stack>
        )}
        {metadata && <EvaluationTable evaluation={metadata.evaluation} manifest={metadata.manifest} />}
      </Stack>
    </Container>
  );
}

function runQuery(snapshot: Snapshot | undefined, query: DashboardQuery): QueryResult {
  if (!snapshot) {
    return {};
  }

  try {
    return { data: queryDashboard(snapshot, query) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Query failed' };
  }
}

function clampHistoryRange(range: DateRange, forecastDate: string, firstDate: string): DateRange {
  const lastDate = previousDate(forecastDate);
  return {
    start: range.start > lastDate ? firstDate : range.start,
    end: range.end > lastDate ? lastDate : range.end,
  };
}

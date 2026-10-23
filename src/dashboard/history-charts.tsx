import { SimpleGrid, Text } from '@mantine/core';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '../constants';
import type { HistorySummary } from '../types';
import { formatAxisTick, formatNumber, formatTooltipValue, formatWorkflowName } from './format';

interface HistoryChartsProps {
  history: HistorySummary;
}

export function HistoryCharts({ history }: HistoryChartsProps) {
  const workflowMinutes = history.workflows.map(row => ({ ...row, name: formatWorkflowName(row.workflow) }));

  return (
    <>
      <Text size="sm">
        {formatNumber(history.minutes)} minutes / {formatNumber(history.jobs)} jobs / {formatNumber(history.runs)} runs.
        Reruns: {formatNumber(history.rerunMinutes)} min. Median job duration: {formatNumber(history.medianDuration)}{' '}
        min.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <div
          style={{ height: Math.max(300, history.workflows.length * 32) }}
          role="img"
          aria-label="Workflow contribution in execution minutes"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workflowMinutes} layout="vertical" margin={{ left: 10, right: 15 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatAxisTick} />
              <YAxis dataKey="name" interval={0} type="category" width={180} tick={{ fontSize: 10 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey="minutes" name="Execution minutes" fill={CHART_COLORS.primary} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ height: 300 }} role="img" aria-label="Job-duration histogram in minutes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history.histogram} barCategoryGap={1} margin={{ right: 15 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tickFormatter={formatAxisTick} width={50} />
              <Tooltip />
              <Bar dataKey="count" name="Jobs" fill={CHART_COLORS.primary} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SimpleGrid>
    </>
  );
}

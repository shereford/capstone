import { SimpleGrid, Text } from '@mantine/core';
import type { ForecastSummary } from '../types';
import { formatNumber } from './format';

interface ForecastTotalsProps {
  forecast: ForecastSummary;
  baselineDays: number;
}

export function ForecastTotals({ forecast, baselineDays }: ForecastTotalsProps) {
  const totals = [
    { label: `Actual through ${forecast.actualThrough} (min)`, value: forecast.actualTotal },
    { label: 'Regression month-end (min)', value: forecast.total },
    { label: `${baselineDays}-day average month-end (min)`, value: forecast.baselineTotal },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }}>
      {totals.map(({ label, value }) => (
        <div key={label}>
          <Text size="sm">{label}</Text>
          <Text fw={700}>{formatNumber(value)}</Text>
        </div>
      ))}
    </SimpleGrid>
  );
}

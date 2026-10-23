import { Stack, Table, Text } from '@mantine/core';
import type { Evaluation, Manifest } from '../types';
import { formatMonth, formatNumber } from './format';

interface EvaluationTableProps {
  evaluation: Evaluation;
  manifest: Manifest;
}

export function EvaluationTable({ evaluation, manifest }: EvaluationTableProps) {
  const models = [
    { label: 'Ridge regression', metrics: evaluation.model },
    { label: `${manifest.baseline_days}-day average`, metrics: evaluation.baseline },
  ];

  return (
    <Stack gap="xs">
      <Text size="sm">{describeEvaluation(evaluation, manifest)}</Text>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Model</Table.Th>
            <Table.Th>MAE (min)</Table.Th>
            <Table.Th>RMSE (min)</Table.Th>
            <Table.Th>Mean error (min)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {models.map(({ label, metrics }) => (
            <Table.Tr key={label}>
              <Table.Td>{label}</Table.Td>
              <Table.Td>{formatNumber(metrics.mae)}</Table.Td>
              <Table.Td>{formatNumber(metrics.rmse)}</Table.Td>
              <Table.Td>{formatNumber(metrics.mean_error)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function describeEvaluation(evaluation: Evaluation, manifest: Manifest) {
  const forecastDates = evaluation.rows.length;
  const overpredicted = evaluation.rows.filter(row => row.predicted > row.actual).length;
  const months = evaluation.independent_test_months;
  const monthText = months === 1 ? 'One evaluation month' : `${months} evaluation months`;
  const overpredictedText =
    overpredicted === forecastDates ? `all ${forecastDates}` : `${overpredicted} of ${forecastDates}`;
  return `${formatMonth(manifest.test_start)} - All workflows - ${forecastDates} forecast dates. ${monthText}. Regression overpredicted ${overpredictedText} totals.`;
}

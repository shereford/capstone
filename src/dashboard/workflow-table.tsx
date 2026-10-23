import { Table } from '@mantine/core';
import type { WorkflowForecast } from '../types';
import { formatNumber, formatWorkflowName } from './format';

interface WorkflowTableProps {
  workflows: WorkflowForecast[];
}

export function WorkflowTable({ workflows }: WorkflowTableProps) {
  const rows = [...workflows].sort((a, b) => b.forecast - a.forecast);

  return (
    <Table.ScrollContainer minWidth={650}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Workflow</Table.Th>
            <Table.Th>Observed min</Table.Th>
            <Table.Th>Remaining min</Table.Th>
            <Table.Th>Total min</Table.Th>
            <Table.Th>History</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(row => (
            <Table.Tr key={row.workflow}>
              <Table.Td>{formatWorkflowName(row.workflow)}</Table.Td>
              <Table.Td>{formatNumber(row.observed)}</Table.Td>
              <Table.Td>{formatNumber(row.forecast)}</Table.Td>
              <Table.Td>{formatNumber(row.observed + row.forecast)}</Table.Td>
              <Table.Td>
                {row.history_days} days / {formatNumber(row.history_jobs)} jobs
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

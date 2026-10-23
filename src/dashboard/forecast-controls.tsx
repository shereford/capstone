import { Group, Select } from '@mantine/core';
import { ALL_WORKFLOWS } from '../constants';
import { formatWorkflowName } from './format';

interface ForecastControlsProps {
  origins: string[];
  workflows: string[];
  forecastDate: string;
  workflow: string;
  onForecastDateChange: (value: string | null) => void;
  onWorkflowChange: (workflow: string) => void;
}

export function ForecastControls({
  origins,
  workflows,
  forecastDate,
  workflow,
  onForecastDateChange,
  onWorkflowChange,
}: ForecastControlsProps) {
  const workflowOptions = [
    { value: ALL_WORKFLOWS, label: 'All workflows' },
    ...workflows.map(name => ({ value: name, label: formatWorkflowName(name) })),
  ];

  return (
    <Group grow>
      <Select
        label="Forecast date (UTC)"
        value={forecastDate}
        onChange={onForecastDateChange}
        data={origins}
        searchable
        allowDeselect={false}
      />
      <Select
        label="Workflow"
        value={workflow}
        onChange={value => onWorkflowChange(value ?? ALL_WORKFLOWS)}
        data={workflowOptions}
        searchable
        allowDeselect={false}
      />
    </Group>
  );
}

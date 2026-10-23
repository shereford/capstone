import { useState } from 'react';
import { Button, Group, TextInput } from '@mantine/core';
import type { DateRange } from '../types';

interface HistoryFiltersProps {
  range: DateRange;
  firstDate: string;
  lastDate: string;
  onApply: (range: DateRange) => void;
}

export function HistoryFilters({ range, firstDate, lastDate, onApply }: HistoryFiltersProps) {
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        onApply({ start, end });
      }}
    >
      <Group align="end">
        <TextInput
          label="History start"
          type="date"
          min={firstDate}
          max={lastDate}
          value={start}
          required
          onChange={event => setStart(event.currentTarget.value)}
        />
        <TextInput
          label="History end"
          type="date"
          min={start}
          max={lastDate}
          value={end}
          required
          onChange={event => setEnd(event.currentTarget.value)}
        />
        <Button type="submit">Apply dates</Button>
      </Group>
    </form>
  );
}

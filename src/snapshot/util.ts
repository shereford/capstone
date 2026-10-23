import { ALL_WORKFLOWS } from '../constants';

export function matchesWorkflow(selected: string, workflow: string) {
  return selected === ALL_WORKFLOWS || workflow === selected;
}

export function sumBy<T>(rows: T[], value: (row: T) => number) {
  let total = 0;
  for (const row of rows) {
    total += value(row);
  }
  return total;
}

export function median(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

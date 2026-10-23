export function formatNumber(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatWorkflowName(workflow: string) {
  return workflow.replace('.github/workflows/', '').replace('dynamic/', '');
}

export function formatAxisTick(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value);
}

export function formatTooltipValue(value: unknown) {
  return formatNumber(Number(value));
}

export function formatMonth(date: string) {
  return new Date(date).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

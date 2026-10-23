import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../constants';
import type { TrajectoryPoint } from '../types';
import { formatAxisTick, formatTooltipValue } from './format';

interface TrajectoryChartProps {
  points: TrajectoryPoint[];
  forecastDate: string;
  previousOrigin?: string;
  baselineDays: number;
}

export function TrajectoryChart({ points, forecastDate, previousOrigin, baselineDays }: TrajectoryChartProps) {
  return (
    <div
      style={{ height: 300 }}
      role="img"
      aria-label="Cumulative actual execution minutes compared with regression and average forecasts"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 20, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={date => date.slice(5)} minTickGap={28} />
          <YAxis tickFormatter={formatAxisTick} width={55} />
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
          <ReferenceLine x={forecastDate} stroke={CHART_COLORS.marker} strokeDasharray="4 4" />
          <Line
            dataKey="actual"
            name="Actual"
            stroke={CHART_COLORS.actual}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="predicted"
            name="Regression"
            stroke={CHART_COLORS.primary}
            dot={false}
            strokeDasharray="6 4"
            isAnimationActive={false}
          />
          <Line
            dataKey="baseline"
            name={`${baselineDays}-day average`}
            stroke={CHART_COLORS.baseline}
            dot={false}
            strokeDasharray="3 4"
            isAnimationActive={false}
          />
          {previousOrigin && (
            <Line
              dataKey="previous"
              name={`Regression from ${previousOrigin}`}
              stroke={CHART_COLORS.previous}
              dot={false}
              strokeDasharray="8 3"
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

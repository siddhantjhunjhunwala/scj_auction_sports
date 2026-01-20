import { useMemo } from 'react';

interface TrendData {
  matchNumber: number;
  points: number;
}

interface PlayerTrendChartProps {
  data: TrendData[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

export function PlayerTrendChart({
  data,
  width = 200,
  height = 60,
  color = '#06b6d4',
  showArea = true,
}: PlayerTrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', points: [] };

    const maxPoints = Math.max(...data.map((d) => d.points), 1);
    const minPoints = Math.min(...data.map((d) => d.points), 0);
    const range = maxPoints - minPoints || 1;

    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const scaleX = (i: number) => padding + (i / (data.length - 1 || 1)) * chartWidth;
    const scaleY = (val: number) =>
      height - padding - ((val - minPoints) / range) * chartHeight;

    const points = data.map((d, i) => ({
      x: scaleX(i),
      y: scaleY(d.points),
      value: d.points,
      match: d.matchNumber,
    }));

    // Create path
    const pathParts = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`));
    const path = pathParts.join(' ');

    // Create area path (for fill)
    const areaPath = `${path} L ${points[points.length - 1]?.x || 0} ${height - padding} L ${
      padding
    } ${height - padding} Z`;

    return { path, areaPath, points };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-xs"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient definition */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {showArea && (
        <path
          d={chartData.areaPath}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />
      )}

      {/* Line */}
      <path d={chartData.path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Points */}
      {chartData.points.map((point, i) => (
        <g key={i}>
          <circle cx={point.x} cy={point.y} r="3" fill={color} className="transition-all duration-200" />
          {/* Tooltip on hover */}
          <title>
            Match {point.match}: {point.value} pts
          </title>
        </g>
      ))}
    </svg>
  );
}

export default PlayerTrendChart;

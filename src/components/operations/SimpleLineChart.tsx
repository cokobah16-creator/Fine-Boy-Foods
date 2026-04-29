interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
  format?: (n: number) => string;
  stroke?: string;
}

export function SimpleLineChart({
  data,
  height = 180,
  format,
  stroke = "#1F6E3D",
}: Props) {
  if (data.length === 0) {
    return (
      <div
        className="text-xs text-charcoal-400 text-center"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const width = 600;
  const padding = 24;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const max = Math.max(1, ...data.map((d) => d.value));

  const points = data
    .map((d, i) => {
      const x = padding + (i / Math.max(1, data.length - 1)) * innerW;
      const y = padding + innerH - (d.value / max) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${padding + innerH} ${points} ${
    padding + innerW
  },${padding + innerH}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Line chart"
      style={{ maxHeight: height }}
    >
      <polygon points={areaPoints} fill={stroke} opacity="0.08" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = padding + (i / Math.max(1, data.length - 1)) * innerW;
        const y = padding + innerH - (d.value / max) * innerH;
        return (
          <g key={d.label}>
            <circle cx={x} cy={y} r={3} fill={stroke} />
            <title>
              {d.label}: {format ? format(d.value) : d.value}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

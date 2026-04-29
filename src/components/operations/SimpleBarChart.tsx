interface Series {
  label: string;
  value: number;
  // Tailwind class for the fill
  fill?: string;
}

interface Props {
  data: Series[];
  // Currency or count formatter
  format?: (n: number) => string;
  // Optional height in px
  height?: number;
}

export function SimpleBarChart({ data, format, height = 180 }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div
      className="w-full flex items-end gap-2"
      style={{ height }}
      role="img"
      aria-label="Bar chart"
    >
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div
            key={d.label}
            className="flex-1 min-w-0 flex flex-col items-center gap-1.5"
          >
            <div className="flex-1 w-full flex items-end">
              <div
                className={`w-full rounded-t-sm ${d.fill ?? "bg-green-500"}`}
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${format ? format(d.value) : d.value}`}
              />
            </div>
            <span className="text-[10px] text-charcoal-400 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

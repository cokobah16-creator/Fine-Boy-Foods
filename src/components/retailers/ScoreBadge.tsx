interface Props {
  score: number;
  showLabel?: boolean;
}

function getScoreTier(score: number): {
  label: string;
  style: string;
  dot: string;
} {
  if (score >= 80)
    return {
      label: "Hot Lead",
      style: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      dot: "bg-red-500",
    };
  if (score >= 60)
    return {
      label: "Good Lead",
      style: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      dot: "bg-emerald-500",
    };
  if (score >= 40)
    return {
      label: "Maybe",
      style: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      dot: "bg-amber-400",
    };
  return {
    label: "Weak Lead",
    style: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-300",
    dot: "bg-gray-400",
  };
}

export function ScoreBadge({ score, showLabel = true }: Props) {
  const tier = getScoreTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tier.style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
      {score}
      {showLabel && ` · ${tier.label}`}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const tier = getScoreTier(score);
  const barColor =
    score >= 80
      ? "bg-red-500"
      : score >= 60
        ? "bg-emerald-500"
        : score >= 40
          ? "bg-amber-400"
          : "bg-gray-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${tier.style}`}>
        {tier.label}
      </span>
    </div>
  );
}

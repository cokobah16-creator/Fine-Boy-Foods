interface Props {
  score: number;
  showLabel?: boolean;
}

type Tier = {
  label: string;
  badge: string;
  dot: string;
  bar: string;
  pill: string;
};

function getScoreTier(score: number): Tier {
  if (score >= 80)
    return {
      label: "Hot lead",
      // Warm cream-orange (NOT pure red) — feels like a hot pepper on cream UI
      badge: "bg-tier-hot-bg text-tier-hot-fg ring-1 ring-inset ring-tier-hot-ring",
      dot:   "bg-tier-hot-fg",
      bar:   "bg-tier-hot-fg",
      pill:  "bg-tier-hot-bg text-tier-hot-fg ring-1 ring-inset ring-tier-hot-ring",
    };
  if (score >= 60)
    return {
      label: "Good lead",
      badge: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
      dot:   "bg-green-500",
      bar:   "bg-green-500",
      pill:  "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
    };
  if (score >= 40)
    return {
      label: "Maybe",
      badge: "bg-tier-maybe-bg text-tier-maybe-fg ring-1 ring-inset ring-tier-maybe-ring",
      dot:   "bg-gold-400",
      bar:   "bg-gold-400",
      pill:  "bg-tier-maybe-bg text-tier-maybe-fg ring-1 ring-inset ring-tier-maybe-ring",
    };
  return {
    label: "Weak lead",
    badge: "bg-charcoal-50 text-charcoal-500 ring-1 ring-inset ring-charcoal-200",
    dot:   "bg-charcoal-300",
    bar:   "bg-charcoal-300",
    pill:  "bg-charcoal-50 text-charcoal-500 ring-1 ring-inset ring-charcoal-200",
  };
}

export function ScoreBadge({ score, showLabel = true }: Props) {
  const tier = getScoreTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tier.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
      {score}
      {showLabel && <span className="font-medium opacity-80">· {tier.label}</span>}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const tier = getScoreTier(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-cream-100">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ease-standard ${tier.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-sm ${tier.pill}`}>
        {tier.label}
      </span>
    </div>
  );
}

import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: ReactNode;
}

const TONE_STYLES: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-white ring-charcoal-100/70",
  good: "bg-green-50 ring-green-100",
  warn: "bg-cream-100 ring-cream-300",
  bad: "bg-[#FFE9D6] ring-[#F4A36A]",
};

export function StatCard({ label, value, hint, tone = "neutral", icon }: Props) {
  return (
    <div
      className={`rounded-lg ring-1 ${TONE_STYLES[tone]} p-4 shadow-xs flex flex-col`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow text-charcoal-500">{label}</p>
        {icon && <div className="text-charcoal-400">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-charcoal-700 leading-tight">
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-charcoal-400 mt-1.5 leading-snug">
          {hint}
        </p>
      )}
    </div>
  );
}

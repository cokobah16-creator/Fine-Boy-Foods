import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="rounded-lg ring-1 ring-charcoal-100 bg-white p-8 text-center">
      {icon && (
        <div className="mx-auto h-10 w-10 mb-3 text-charcoal-300">{icon}</div>
      )}
      <h3 className="text-base font-semibold text-charcoal-700">{title}</h3>
      {description && (
        <p className="text-sm text-charcoal-400 mt-1.5 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import logoUrl from "@/assets/fbf-logo.png";
import { getAllRetailers } from "@/services/retailerService";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string | number | null;
  badgeKind?: "ai" | "count";
}

const WORKSPACE_NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: HomeIcon, exact: true },
  { label: "Find Retailers", to: "/retailers/find", icon: SparklesIcon, badge: "AI", badgeKind: "ai" },
  { label: "Retailers", to: "/retailers", icon: BuildingStorefrontIcon, exact: true, badgeKind: "count" },
  { label: "Add retailer", to: "/retailers/import", icon: ArrowUpTrayIcon },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function Badge({ kind, value }: { kind: NavItem["badgeKind"]; value: string | number }) {
  if (kind === "ai") {
    return (
      <span className="ml-auto inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
        {value}
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center rounded-full bg-charcoal-700 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-charcoal-200">
      {value}
    </span>
  );
}

function NavLinkItem({ item, count }: { item: NavItem; count: number | null }) {
  const badgeValue =
    item.badgeKind === "count" ? (count ?? null) : item.badge ?? null;

  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-standard ${
          isActive
            ? "bg-green-500 text-white shadow-sm"
            : "text-charcoal-200 hover:bg-charcoal-800 hover:text-cream-50"
        }`
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
      <span className="flex-1 truncate">{item.label}</span>
      {badgeValue !== null && badgeValue !== undefined && (
        <Badge kind={item.badgeKind} value={badgeValue} />
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [retailerCount, setRetailerCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllRetailers()
      .then((rs) => {
        if (!cancelled) setRetailerCount(rs.length);
      })
      .catch(() => {
        // Sidebar is decorative — silently swallow so a failed fetch doesn't
        // break navigation. The badge just won't render.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-charcoal-900 text-cream-50">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-charcoal-800">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Fine Boy Foods"
            className="h-10 w-10 rounded-full ring-1 ring-charcoal-700 bg-cream-100 flex-shrink-0"
          />
          <div>
            <p className="text-sm font-bold text-cream-50 leading-tight">Fine Boy Foods</p>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-charcoal-300 mt-0.5 uppercase">
              Retail CRM
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-charcoal-800 text-charcoal-300"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-charcoal-300 uppercase">
          Workspace
        </p>
        {WORKSPACE_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} count={retailerCount} />
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-charcoal-800 bg-charcoal-900 h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 fbf-scrim lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-50 w-60 bg-charcoal-900 lg:hidden shadow-lg">
        <SidebarContent onClose={onClose} />
      </div>
    </>
  );
}

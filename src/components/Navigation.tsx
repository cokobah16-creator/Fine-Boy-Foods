import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import logoUrl from "@/assets/fbf-logo.png";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: HomeIcon, exact: true },
];

const RETAILER_NAV: NavItem[] = [
  { label: "All retailers", to: "/retailers", icon: BuildingStorefrontIcon, exact: true },
  { label: "Find new leads", to: "/retailers/find", icon: MagnifyingGlassIcon },
  { label: "Add retailer", to: "/retailers/import", icon: ArrowUpTrayIcon },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function NavLinkItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-standard ${
          isActive
            ? "bg-green-500 text-white shadow-sm"
            : "text-charcoal-500 hover:bg-cream-100 hover:text-charcoal-700"
        }`
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
      {item.label}
    </NavLink>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-charcoal-100">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Fine Boy Foods"
            className="h-10 w-10 rounded-full ring-1 ring-charcoal-100 bg-cream-100 flex-shrink-0"
          />
          <div>
            <p className="text-sm font-bold text-charcoal-700 leading-tight">Fine Boy Foods</p>
            <p className="text-[11px] text-charcoal-400 mt-0.5">Retailer Finder</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-cream-100 text-charcoal-400"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLinkItem key={item.to} item={item} />
        ))}

        <div className="pt-5 pb-2">
          <p className="px-3 eyebrow">Pipeline</p>
        </div>

        {RETAILER_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-charcoal-100">
        <p className="text-[11px] text-charcoal-400 text-center">
          Fine Boy Foods Ltd · Abuja
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-charcoal-100 bg-white h-screen sticky top-0">
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
      <div className="fixed inset-y-0 left-0 z-50 w-60 bg-white lg:hidden shadow-lg">
        <SidebarContent onClose={onClose} />
      </div>
    </>
  );
}

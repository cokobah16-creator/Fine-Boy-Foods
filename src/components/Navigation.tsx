import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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
  { label: "All Retailers", to: "/retailers", icon: BuildingStorefrontIcon, exact: true },
  { label: "Find New Leads", to: "/retailers/find", icon: MagnifyingGlassIcon },
  { label: "Import Retailers", to: "/retailers/import", icon: ArrowUpTrayIcon },
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
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-brand-600 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {item.label}
    </NavLink>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">FBF</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Fine Boy Foods</p>
            <p className="text-xs text-gray-400">Retail CRM</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLinkItem key={item.to} item={item} />
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Retailer Finder
          </p>
        </div>

        {RETAILER_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Fine Boy Foods &copy; 2025</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-gray-100 bg-white h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-50 w-56 bg-white lg:hidden shadow-xl">
        <SidebarContent onClose={onClose} />
      </div>
    </>
  );
}

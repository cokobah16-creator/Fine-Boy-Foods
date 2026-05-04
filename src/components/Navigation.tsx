import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  CubeIcon,
  ShoppingCartIcon,
  TruckIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ChartBarIcon,
  BeakerIcon,
  BellAlertIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowLeftStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import logoUrl from "@/assets/fbf-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/operations";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  exact?: boolean;
}

const OPERATIONS_NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: HomeIcon, exact: true },
  { label: "Inventory", to: "/inventory", icon: CubeIcon },
  { label: "Orders", to: "/orders", icon: ShoppingCartIcon },
  { label: "Customers", to: "/customers", icon: BuildingStorefrontIcon },
  { label: "Production", to: "/production", icon: BeakerIcon },
  { label: "Quality Control", to: "/quality", icon: ShieldCheckIcon },
  { label: "Distribution", to: "/distribution", icon: TruckIcon },
  { label: "Finance", to: "/finance", icon: CurrencyDollarIcon },
  { label: "Payroll", to: "/payroll", icon: BanknotesIcon },
  { label: "Analytics", to: "/analytics", icon: ChartBarIcon },
  { label: "Alerts", to: "/alerts", icon: BellAlertIcon },
];

const CRM_NAV: NavItem[] = [
  { label: "All retailers", to: "/retailers", icon: BuildingStorefrontIcon, exact: true },
  { label: "Find new leads", to: "/retailers/find", icon: MagnifyingGlassIcon },
  { label: "Add retailer", to: "/retailers/import", icon: ArrowUpTrayIcon },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function NavLinkItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onClick}
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
  const { session, signOut } = useAuth();
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
            <p className="text-[11px] text-charcoal-400 mt-0.5">Retail OS</p>
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
        <p className="px-3 eyebrow mb-2">Operations</p>
        {OPERATIONS_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} onClick={onClose} />
        ))}

        <div className="pt-5 pb-2">
          <p className="px-3 eyebrow">Retailer CRM</p>
        </div>
        {CRM_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} onClick={onClose} />
        ))}

        <div className="pt-5 pb-2">
          <p className="px-3 eyebrow">Account</p>
        </div>
        <NavLinkItem
          item={{ label: "Settings", to: "/settings", icon: Cog6ToothIcon }}
          onClick={onClose}
        />
      </nav>

      {/* Footer */}
      {session && (
        <div className="px-4 py-3 border-t border-charcoal-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
              <UserCircleIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal-700 truncate">
                {session.name}
              </p>
              <p className="text-[11px] text-charcoal-400">
                {ROLE_LABELS[session.role]}
              </p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md hover:bg-cream-100 text-charcoal-400"
              title="Sign out"
            >
              <ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
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
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white lg:hidden shadow-lg">
        <SidebarContent onClose={onClose} />
      </div>
    </>
  );
}

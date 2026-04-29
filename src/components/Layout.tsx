import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { Sidebar, MobileSidebar } from "./Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/auth/LoginPage";
import logoUrl from "@/assets/fbf-logo.png";

export function Layout() {
  const { session, ready } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <img
            src={logoUrl}
            alt="Fine Boy Foods"
            className="h-12 w-12 rounded-full ring-1 ring-charcoal-100 bg-cream-100 mx-auto mb-3"
          />
          <p className="text-sm text-charcoal-500">Starting Fine Boy Foods…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-cream-50/90 backdrop-blur-md border-b border-charcoal-100 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-cream-100 text-charcoal-500"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={logoUrl}
              alt="Fine Boy Foods"
              className="h-8 w-8 rounded-full ring-1 ring-charcoal-100 bg-cream-100"
            />
            <span className="text-sm font-bold text-charcoal-700">Fine Boy Foods</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

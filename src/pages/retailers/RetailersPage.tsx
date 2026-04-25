import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  FireIcon,
  CheckBadgeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { Retailer, RetailerStatus, RetailerCategory } from "@/types/retailer";
import {
  RETAILER_STATUS_LABELS,
  RETAILER_CATEGORY_LABELS,
  ABUJA_AREAS,
} from "@/types/retailer";
import { getAllRetailers, updateRetailer } from "@/services/retailerService";
import { RetailerCard } from "@/components/retailers/RetailerCard";
import { ScoreBadge } from "@/components/retailers/ScoreBadge";

const STATUS_OPTIONS: RetailerStatus[] = [
  "not_contacted",
  "contacted",
  "interested",
  "sample_delivered",
  "negotiating",
  "supplied",
  "rejected",
  "do_not_contact",
];

const CATEGORY_OPTIONS: RetailerCategory[] = [
  "supermarket",
  "minimart",
  "provision_store",
  "pharmacy",
  "fuel_station_mart",
  "school_store",
  "campus_store",
  "hotel",
  "gym",
  "cafe",
  "restaurant",
  "distributor",
  "wholesaler",
  "other",
];

type ViewMode = "cards" | "table";

export function RetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMinScore, setFilterMinScore] = useState(0);

  useEffect(() => {
    getAllRetailers()
      .then(setRetailers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return retailers.filter((r) => {
      if (
        search &&
        !r.businessName.toLowerCase().includes(search.toLowerCase()) &&
        !r.area.toLowerCase().includes(search.toLowerCase()) &&
        !(r.address ?? "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterArea !== "all" && r.area !== filterArea) return false;
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (r.leadScore < filterMinScore) return false;
      return true;
    });
  }, [retailers, search, filterArea, filterCategory, filterStatus, filterMinScore]);

  const stats = useMemo(() => {
    return {
      total: retailers.length,
      hotLeads: retailers.filter((r) => r.leadScore >= 80).length,
      active: retailers.filter((r) =>
        ["interested", "sample_delivered", "negotiating"].includes(r.status)
      ).length,
      supplied: retailers.filter((r) => r.status === "supplied").length,
    };
  }, [retailers]);

  async function handleStatusChange(id: string, status: RetailerStatus) {
    await updateRetailer(id, { status });
    setRetailers((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retailer Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            Abuja retailers for Fine Boy Foods snack distribution
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/retailers/find" className="btn-primary">
            <MagnifyingGlassIcon className="h-4 w-4" />
            Find Leads
          </Link>
          <Link to="/retailers/import" className="btn-secondary">
            <PlusIcon className="h-4 w-4" />
            Add
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Retailers",
            value: stats.total,
            icon: BuildingStorefrontIcon,
            color: "text-gray-600",
            bg: "bg-gray-100",
          },
          {
            label: "Hot Leads",
            value: stats.hotLeads,
            icon: FireIcon,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Active Pipeline",
            value: stats.active,
            icon: ClockIcon,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Supplied",
            value: stats.supplied,
            icon: CheckBadgeIcon,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search retailers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="input"
          >
            <option value="all">All Areas</option>
            {ABUJA_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{RETAILER_CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{RETAILER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-gray-600 font-medium">
            Min Lead Score: <span className="text-brand-600 font-bold">{filterMinScore}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={filterMinScore}
            onChange={(e) => setFilterMinScore(Number(e.target.value))}
            className="flex-1 max-w-xs accent-brand-600"
          />
        </div>
      </div>

      {/* View toggle + count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length} retailer{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== retailers.length && ` (filtered from ${retailers.length})`}
        </p>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "cards" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "table" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <BuildingStorefrontIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900">No retailers found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Try adjusting your filters, or find new leads with the AI agent.
          </p>
          <Link to="/retailers/find" className="btn-primary mx-auto">
            <MagnifyingGlassIcon className="h-4 w-4" />
            Find Retailers
          </Link>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((r) => (
            <RetailerCard key={r.id} retailer={r} onStatusChange={handleStatusChange} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Retailer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Area
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/retailers/${r.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-600"
                      >
                        {r.businessName}
                      </Link>
                      {r.phone && (
                        <p className="text-xs text-gray-400 mt-0.5">{r.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.area}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {RETAILER_CATEGORY_LABELS[r.category]}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={r.leadScore} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          handleStatusChange(r.id, e.target.value as RetailerStatus)
                        }
                        className="text-xs border-0 bg-transparent p-0 font-medium focus:ring-0 cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {RETAILER_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.phone && (
                          <a
                            href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-600 hover:underline"
                          >
                            WA
                          </a>
                        )}
                        <Link
                          to={`/retailers/${r.id}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

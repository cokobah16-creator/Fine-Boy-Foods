import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import type { RetailerCategory } from "@/types/retailer";
import {
  RETAILER_CATEGORY_LABELS,
  ABUJA_AREAS,
} from "@/types/retailer";
import { createRetailer, checkDuplicate } from "@/services/retailerService";

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

export function RetailerImportPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    category: "minimart" as RetailerCategory,
    area: ABUJA_AREAS[0] as string,
    address: "",
    phone: "",
    email: "",
    website: "",
    leadScore: 60,
    scoreReason: "",
    suggestedPitch: "",
    recommendedNextStep: "",
    source: "Manual entry",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDupWarning(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName.trim()) return;

    setSaving(true);
    try {
      const dup = await checkDuplicate(form.businessName, form.area, form.phone || null);
      if (dup) {
        setDupWarning(
          `A retailer named "${dup.businessName}" in ${dup.area} already exists.`
        );
        setSaving(false);
        return;
      }

      await createRetailer({
        businessName: form.businessName.trim(),
        category: form.category,
        area: form.area,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        socialLinks: [],
        activeChannels: [],
        mapsUrl: null,
        leadScore: form.leadScore,
        scoreReason: form.scoreReason || null,
        suggestedPitch: form.suggestedPitch || null,
        recommendedNextStep: form.recommendedNextStep || null,
        source: form.source || "Manual entry",
        status: "not_contacted",
      });
      setSaved(true);
      setTimeout(() => navigate("/retailers"), 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to save retailer. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckIcon className="h-8 w-8 text-green-700" strokeWidth={2} />
        </div>
        <h2 className="heading-h1 text-[22px]">Retailer saved</h2>
        <p className="text-sm text-charcoal-500 mt-2">Redirecting to your retailer pipeline…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-11 w-11 rounded-md bg-cream-200 flex items-center justify-center">
          <ArrowUpTrayIcon className="h-5 w-5 text-gold-600" strokeWidth={2} />
        </div>
        <div>
          <p className="eyebrow mb-1">Add</p>
          <h1 className="heading-h1 text-[26px] leading-tight">Add a retailer</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            Manually save a new Abuja retailer lead.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Core Info */}
        <div className="card">
          <p className="eyebrow mb-4">Business info</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Business name <span className="text-[#8B1F1A]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                className="input"
                placeholder="e.g. Next Cash and Carry"
              />
              {dupWarning && (
                <p className="mt-1.5 text-xs text-[#8B1F1A]">{dupWarning}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value as RetailerCategory)}
                className="input"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{RETAILER_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Abuja area
              </label>
              <select
                value={form.area}
                onChange={(e) => update("area", e.target.value)}
                className="input"
              >
                {ABUJA_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="input"
                placeholder="Full street address"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <p className="eyebrow mb-4">Contact details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Phone / WhatsApp
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="input font-mono"
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="input"
                placeholder="info@store.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className="input"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Lead Qualification */}
        <div className="card">
          <p className="eyebrow mb-4">Lead qualification</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Lead score:{" "}
                <span className="text-green-600 tabular-nums">{form.leadScore}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.leadScore}
                onChange={(e) => update("leadScore", Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-[11px] text-charcoal-400 mt-1">
                <span>0 — Weak</span>
                <span>40 — Maybe</span>
                <span>60 — Good</span>
                <span>80 — Hot</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Score reason
              </label>
              <input
                type="text"
                value={form.scoreReason}
                onChange={(e) => update("scoreReason", e.target.value)}
                className="input"
                placeholder="High foot traffic + supermarket + snack shelf potential"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Suggested pitch
              </label>
              <textarea
                rows={2}
                value={form.suggestedPitch}
                onChange={(e) => update("suggestedPitch", e.target.value)}
                className="input resize-none"
                placeholder="How should we pitch FBF to this retailer?"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Recommended next step
              </label>
              <input
                type="text"
                value={form.recommendedNextStep}
                onChange={(e) => update("recommendedNextStep", e.target.value)}
                className="input"
                placeholder="e.g. Visit with samples and price list"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
                Source
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                className="input"
                placeholder="e.g. Manual entry, Referral, Google Maps"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <>
                <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" strokeWidth={2} />
                Save retailer
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/retailers")}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

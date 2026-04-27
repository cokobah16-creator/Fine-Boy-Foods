/**
 * Supabase Edge Function: find-retailers
 *
 * Retrieves real businesses from Google Places, enriches with website contact
 * signals, and then asks Claude to score/qualify only those real businesses.
 *
 * Required secrets:
 * - GOOGLE_MAPS_API_KEY
 * - ANTHROPIC_API_KEY (optional but recommended for better scoring/pitch text)
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchInput {
  area: string;
  category: string;
  productFocus: string;
  minimumLeadScore: number;
  numberOfLeads: number;
}

interface GoogleTextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
}

interface GooglePlaceDetails {
  result?: {
    place_id: string;
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    url?: string;
    types?: string[];
  };
}

interface CandidateLead {
  businessName: string;
  category:
    | "supermarket"
    | "minimart"
    | "provision_store"
    | "pharmacy"
    | "fuel_station_mart"
    | "school_store"
    | "campus_store"
    | "hotel"
    | "gym"
    | "cafe"
    | "restaurant"
    | "distributor"
    | "wholesaler"
    | "other";
  area: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  socialLinks: string[];
  mapsUrl: string | null;
}

function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.toString();
  } catch {
    return null;
  }
}

function categoryQuery(category: string): string {
  const map: Record<string, string> = {
    any: "retail stores",
    supermarket: "supermarket",
    minimart: "mini mart",
    provision_store: "provision store",
    pharmacy: "pharmacy",
    fuel_station_mart: "fuel station convenience store",
    school_store: "school store",
    campus_store: "campus store",
    hotel: "hotel gift shop",
    gym: "gym",
    cafe: "cafe",
    restaurant: "restaurant",
    distributor: "food distributor",
    wholesaler: "food wholesaler",
    other: "retail shop",
  };
  return map[category] ?? "retail stores";
}

function mapGoogleTypesToCategory(types: string[] = []): CandidateLead["category"] {
  const t = new Set(types);
  if (t.has("supermarket") || t.has("grocery_or_supermarket")) return "supermarket";
  if (t.has("convenience_store")) return "minimart";
  if (t.has("pharmacy") || t.has("drugstore")) return "pharmacy";
  if (t.has("gas_station")) return "fuel_station_mart";
  if (t.has("school") || t.has("primary_school") || t.has("secondary_school")) return "school_store";
  if (t.has("university")) return "campus_store";
  if (t.has("lodging")) return "hotel";
  if (t.has("gym")) return "gym";
  if (t.has("cafe")) return "cafe";
  if (t.has("restaurant")) return "restaurant";
  if (t.has("storage") || t.has("warehouse")) return "wholesaler";
  if (t.has("store") || t.has("food_store")) return "provision_store";
  return "other";
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function fetchWithTimeout(url: string, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function searchGooglePlaces(input: SearchInput, apiKey: string): Promise<GoogleTextSearchResult[]> {
  const query = encodeURIComponent(`${categoryQuery(input.category)} in ${input.area}, Abuja, Nigeria`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) {
    throw new Error(`Google text search failed with status ${res.status}`);
  }

  const json = await res.json();
  return (json.results ?? []) as GoogleTextSearchResult[];
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails["result"] | null> {
  const fields = encodeURIComponent(
    [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "url",
      "types",
      "place_id",
    ].join(",")
  );
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;

  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) return null;

  const json = (await res.json()) as GooglePlaceDetails;
  return json.result ?? null;
}

async function enrichFromWebsite(website: string | null): Promise<{ email: string | null; socialLinks: string[] }> {
  if (!website) return { email: null, socialLinks: [] };
  const normalized = normalizeUrl(website);
  if (!normalized) return { email: null, socialLinks: [] };

  try {
    const res = await fetchWithTimeout(normalized, 8000);
    if (!res.ok) return { email: null, socialLinks: [] };
    const html = await res.text();

    const emailMatch = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.[0] ?? null;

    const socialPatterns = [
      /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+/gi,
      /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._\/-]+/gi,
      /https?:\/\/(?:www\.)?x\.com\/[A-Za-z0-9_]+/gi,
      /https?:\/\/(?:www\.)?twitter\.com\/[A-Za-z0-9_]+/gi,
      /https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9_\/-]+/gi,
      /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._-]+/gi,
      /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[A-Za-z0-9?=&+_-]+/gi,
    ];

    const socials = unique(
      socialPatterns.flatMap((pattern) => html.match(pattern) ?? []).slice(0, 8)
    );

    return { email: emailMatch, socialLinks: socials };
  } catch {
    return { email: null, socialLinks: [] };
  }
}

async function buildRealCandidates(input: SearchInput, googleApiKey: string): Promise<CandidateLead[]> {
  const textResults = await searchGooglePlaces(input, googleApiKey);

  const detailResults = await Promise.all(
    textResults.slice(0, Math.max(input.numberOfLeads * 3, 12)).map(async (r) => getPlaceDetails(r.place_id, googleApiKey))
  );

  const candidates: CandidateLead[] = [];
  for (const details of detailResults) {
    if (!details?.name) continue;

    const website = details.website ?? null;
    const websiteSignals = await enrichFromWebsite(website);

    candidates.push({
      businessName: details.name,
      category: mapGoogleTypesToCategory(details.types ?? []),
      area: input.area,
      address: details.formatted_address ?? `${input.area}, Abuja, Nigeria`,
      phone: details.international_phone_number ?? details.formatted_phone_number ?? null,
      email: websiteSignals.email,
      website,
      socialLinks: websiteSignals.socialLinks,
      mapsUrl: details.url ?? null,
    });
  }

  // Keep unique businesses by normalized name + address
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((c) => {
    const key = `${c.businessName.toLowerCase().trim()}|${c.address.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueCandidates.slice(0, Math.max(input.numberOfLeads * 2, input.numberOfLeads));
}

function fallbackScoreAndPitch(input: SearchInput, candidates: CandidateLead[]) {
  return {
    results: candidates
      .map((c) => {
        const contactBonus = (c.phone ? 12 : 0) + (c.email ? 8 : 0) + (c.socialLinks.length > 0 ? 6 : 0);
        const base = 55 + contactBonus;
        const leadScore = Math.min(95, Math.max(input.minimumLeadScore, base));
        return {
          ...c,
          leadScore,
          scoreReason: `Real Google business in ${input.area}. Contact fields were extracted from Google Places and website signals.`,
          suggestedPitch: "Introduce Fine Boy Foods premium plantain chips and propose a trial listing with samples.",
          recommendedNextStep: "Call or WhatsApp procurement/manager contact and schedule a short in-store pitch.",
          source: "Google Places + Website Signals",
        };
      })
      .filter((r) => r.leadScore >= input.minimumLeadScore)
      .slice(0, input.numberOfLeads),
  };
}

async function crossReferenceWithClaude(input: SearchInput, candidates: CandidateLead[], anthropicApiKey: string) {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const prompt = `You are the Fine Boy Foods Retailer Qualification Agent.\n\nOnly use the candidate businesses provided below. Do not invent new businesses.\nDo not fabricate phone, email, website, mapsUrl, or social links.\nIf any field is missing, keep it null/empty.\n\nFine Boy Foods context:\n- Abuja snack brand\n- Products: premium plantain chips\n- Product focus: ${input.productFocus}\n\nCandidate businesses (real data from Google Places + website crawl):\n${JSON.stringify(candidates)}\n\nScore each candidate for retail partnership fit (0-100) and include concise rationale.\nOnly return records with score >= ${input.minimumLeadScore}.\nReturn at most ${input.numberOfLeads} results.\n\nReturn ONLY valid JSON in this structure:\n{\n  "results": [\n    {\n      "businessName": "string",\n      "category": "supermarket|minimart|provision_store|pharmacy|fuel_station_mart|school_store|campus_store|hotel|gym|cafe|restaurant|distributor|wholesaler|other",\n      "area": "string",\n      "address": "string",\n      "phone": null,\n      "email": null,\n      "website": null,\n      "socialLinks": [],\n      "mapsUrl": null,\n      "leadScore": 0,\n      "scoreReason": "string",\n      "suggestedPitch": "string",\n      "recommendedNextStep": "string",\n      "source": "Google Places + Claude Cross-Reference"\n    }\n  ]\n}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude cross-reference response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed?.results)) {
    throw new Error("Invalid Claude cross-reference payload");
  }

  return parsed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input: SearchInput = await req.json();

    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_MAPS_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidates = await buildRealCandidates(input, googleApiKey);
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const payload = anthropicApiKey
      ? await crossReferenceWithClaude(input, candidates, anthropicApiKey)
      : fallbackScoreAndPitch(input, candidates);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Agent search failed", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

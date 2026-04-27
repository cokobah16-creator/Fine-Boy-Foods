import { supabase, supabaseConfigured } from "@/lib/supabase";
import { db } from "@/lib/db";
import { seedRetailers } from "@/data/seedRetailers";
import type {
  Retailer,
  RetailerContact,
  RetailerNote,
  RetailerOutreachLog,
  RetailerAgentResult,
  RetailerSearchInput,
} from "@/types/retailer";

function uuid(): string {
  return crypto.randomUUID();
}

// ─── In-Memory Store (used when Supabase is not configured) ───────────────────

let memoryStore: Retailer[] = [...seedRetailers];

// ─── Retailer CRUD ────────────────────────────────────────────────────────────

export async function getAllRetailers(): Promise<Retailer[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseRetailer);
  }

  try {
    const local = await db.retailers.orderBy("createdAt").reverse().toArray();
    if (local.length > 0) return local;
  } catch {
    // Dexie not available
  }

  return memoryStore;
}

export async function getRetailerById(id: string): Promise<Retailer | null> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return mapSupabaseRetailer(data);
  }

  try {
    const local = await db.retailers.get(id);
    if (local) return local;
  } catch {
    // Dexie not available
  }

  return memoryStore.find((r) => r.id === id) ?? null;
}

export async function createRetailer(
  input: Omit<Retailer, "id" | "createdAt" | "updatedAt">
): Promise<Retailer> {
  const now = new Date().toISOString();
  const retailer: Retailer = {
    ...input,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
  };

  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailers")
      .insert(toSupabaseRetailer(retailer))
      .select()
      .single();
    if (error) throw error;
    return mapSupabaseRetailer(data);
  }

  try {
    await db.retailers.add(retailer);
  } catch {
    // Dexie not available
  }
  memoryStore = [retailer, ...memoryStore];
  return retailer;
}

export async function updateRetailer(
  id: string,
  updates: Partial<Omit<Retailer, "id" | "createdAt">>
): Promise<Retailer> {
  const now = new Date().toISOString();
  const patched = { ...updates, updatedAt: now };

  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailers")
      .update(toSupabaseRetailerPartial(patched))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapSupabaseRetailer(data);
  }

  try {
    await db.retailers.update(id, patched);
  } catch {
    // Dexie not available
  }
  memoryStore = memoryStore.map((r) =>
    r.id === id ? { ...r, ...patched } : r
  );
  return (await getRetailerById(id))!;
}

export async function deleteRetailer(id: string): Promise<void> {
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from("retailers").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  try {
    await db.retailers.delete(id);
    await db.retailerNotes.where("retailerId").equals(id).delete();
    await db.retailerContacts.where("retailerId").equals(id).delete();
    await db.retailerOutreachLogs.where("retailerId").equals(id).delete();
    await db.retailerFollowups.where("retailerId").equals(id).delete();
  } catch {
    // Dexie not available
  }
  memoryStore = memoryStore.filter((r) => r.id !== id);
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

export async function checkDuplicate(
  businessName: string,
  area: string,
  phone?: string | null
): Promise<Retailer | null> {
  const all = await getAllRetailers();
  const nameLower = businessName.toLowerCase().trim();
  const areaLower = area.toLowerCase().trim();

  return (
    all.find((r) => {
      const nameMatch =
        r.businessName.toLowerCase().trim() === nameLower &&
        r.area.toLowerCase().trim() === areaLower;
      const phoneMatch =
        phone && r.phone && r.phone.replace(/\s/g, "") === phone.replace(/\s/g, "");
      return nameMatch || phoneMatch;
    }) ?? null
  );
}

// ─── Bulk Save from Agent ─────────────────────────────────────────────────────

export async function saveAgentResults(
  results: RetailerAgentResult[]
): Promise<{ saved: Retailer[]; skipped: string[] }> {
  const saved: Retailer[] = [];
  const skipped: string[] = [];

  for (const result of results) {
    const existing = await checkDuplicate(
      result.businessName,
      result.area,
      result.phone
    );
    if (existing) {
      skipped.push(result.businessName);
      continue;
    }
    const retailer = await createRetailer({
      businessName: result.businessName,
      category: result.category,
      area: result.area,
      address: result.address,
      phone: result.phone,
      email: result.email,
      website: result.website,
      socialLinks: result.socialLinks,
      mapsUrl: result.mapsUrl,
      leadScore: result.leadScore,
      scoreReason: result.scoreReason,
      suggestedPitch: result.suggestedPitch,
      recommendedNextStep: result.recommendedNextStep,
      source: result.source,
      status: "not_contacted",
    });
    saved.push(retailer);
  }

  return { saved, skipped };
}

// ─── Notes ────────────────────────────────────────────────────────────────────

let memoryNotes: RetailerNote[] = [];

export async function getNotesForRetailer(
  retailerId: string
): Promise<RetailerNote[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailer_notes")
      .select("*")
      .eq("retailer_id", retailerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseNote);
  }

  try {
    return await db.retailerNotes
      .where("retailerId")
      .equals(retailerId)
      .reverse()
      .sortBy("createdAt");
  } catch {
    return memoryNotes.filter((n) => n.retailerId === retailerId);
  }
}

export async function addNote(
  retailerId: string,
  note: string,
  createdBy?: string
): Promise<RetailerNote> {
  const record: RetailerNote = {
    id: uuid(),
    retailerId,
    note,
    createdBy: createdBy ?? null,
    createdAt: new Date().toISOString(),
  };

  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailer_notes")
      .insert({
        id: record.id,
        retailer_id: record.retailerId,
        note: record.note,
        created_by: record.createdBy,
        created_at: record.createdAt,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSupabaseNote(data);
  }

  try {
    await db.retailerNotes.add(record);
  } catch {
    memoryNotes = [record, ...memoryNotes];
  }
  return record;
}

// ─── Outreach Logs ────────────────────────────────────────────────────────────

let memoryLogs: RetailerOutreachLog[] = [];

export async function getLogsForRetailer(
  retailerId: string
): Promise<RetailerOutreachLog[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailer_outreach_logs")
      .select("*")
      .eq("retailer_id", retailerId)
      .order("contacted_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseLog);
  }

  try {
    return await db.retailerOutreachLogs
      .where("retailerId")
      .equals(retailerId)
      .reverse()
      .sortBy("contactedAt");
  } catch {
    return memoryLogs.filter((l) => l.retailerId === retailerId);
  }
}

export async function addOutreachLog(
  log: Omit<RetailerOutreachLog, "id" | "contactedAt">
): Promise<RetailerOutreachLog> {
  const record: RetailerOutreachLog = {
    ...log,
    id: uuid(),
    contactedAt: new Date().toISOString(),
  };

  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailer_outreach_logs")
      .insert({
        id: record.id,
        retailer_id: record.retailerId,
        channel: record.channel,
        message: record.message,
        outcome: record.outcome,
        contacted_at: record.contactedAt,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSupabaseLog(data);
  }

  try {
    await db.retailerOutreachLogs.add(record);
  } catch {
    memoryLogs = [record, ...memoryLogs];
  }
  return record;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

let memoryContacts: RetailerContact[] = [];

export async function getContactsForRetailer(
  retailerId: string
): Promise<RetailerContact[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailer_contacts")
      .select("*")
      .eq("retailer_id", retailerId);
    if (error) throw error;
    return (data ?? []).map(mapSupabaseContact);
  }

  try {
    return await db.retailerContacts
      .where("retailerId")
      .equals(retailerId)
      .toArray();
  } catch {
    return memoryContacts.filter((c) => c.retailerId === retailerId);
  }
}

export async function addContact(
  contact: Omit<RetailerContact, "id" | "createdAt">
): Promise<RetailerContact> {
  const record: RetailerContact = {
    ...contact,
    id: uuid(),
    createdAt: new Date().toISOString(),
  };

  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("retailer_contacts")
      .insert({
        id: record.id,
        retailer_id: record.retailerId,
        contact_name: record.contactName,
        role: record.role,
        phone: record.phone,
        email: record.email,
        whatsapp: record.whatsapp,
        created_at: record.createdAt,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSupabaseContact(data);
  }

  try {
    await db.retailerContacts.add(record);
  } catch {
    memoryContacts = [...memoryContacts, record];
  }
  return record;
}

// ─── AI Finder (Real Data only via Edge Function) ──────────────────────────────

export async function findRetailersWithAI(
  input: RetailerSearchInput
): Promise<RetailerAgentResult[]> {
  if (!supabaseConfigured || !supabase) {
    throw new Error(
      "Supabase isn't configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel → Settings → Environment Variables."
    );
  }

  const { data, error } = await supabase.functions.invoke("find-retailers", {
    body: input,
  });
  if (error) {
    const rawMessage = String(error.message ?? "");
    const message = rawMessage.toLowerCase();

    if (message.includes("failed to send a request to the edge function")) {
      throw new Error(
        "Edge Function isn't deployed. Run: supabase functions deploy find-retailers."
      );
    }

    if (message.includes("missing google_maps_api_key")) {
      throw new Error(
        "GOOGLE_MAPS_API_KEY is missing. Run: supabase secrets set GOOGLE_MAPS_API_KEY=your-key."
      );
    }

    throw error;
  }

  const results = (data as { results?: RetailerAgentResult[] })?.results;
  if (!Array.isArray(results)) {
    throw new Error("Invalid retailer search response payload");
  }

  return results;
}

// ─── Supabase Row Mappers ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseRetailer(row: any): Retailer {
  return {
    id: row.id,
    businessName: row.business_name,
    category: row.category,
    area: row.area,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    socialLinks: row.social_links ?? [],
    mapsUrl: row.maps_url,
    leadScore: row.lead_score,
    scoreReason: row.score_reason,
    suggestedPitch: row.suggested_pitch,
    recommendedNextStep: row.recommended_next_step,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabaseRetailer(r: Retailer): Record<string, unknown> {
  return {
    id: r.id,
    business_name: r.businessName,
    category: r.category,
    area: r.area,
    address: r.address,
    phone: r.phone,
    email: r.email,
    website: r.website,
    social_links: r.socialLinks,
    maps_url: r.mapsUrl,
    lead_score: r.leadScore,
    score_reason: r.scoreReason,
    suggested_pitch: r.suggestedPitch,
    recommended_next_step: r.recommendedNextStep,
    source: r.source,
    status: r.status,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function toSupabaseRetailerPartial(
  r: Partial<Retailer>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (r.businessName !== undefined) out.business_name = r.businessName;
  if (r.category !== undefined) out.category = r.category;
  if (r.area !== undefined) out.area = r.area;
  if (r.address !== undefined) out.address = r.address;
  if (r.phone !== undefined) out.phone = r.phone;
  if (r.email !== undefined) out.email = r.email;
  if (r.website !== undefined) out.website = r.website;
  if (r.socialLinks !== undefined) out.social_links = r.socialLinks;
  if (r.mapsUrl !== undefined) out.maps_url = r.mapsUrl;
  if (r.leadScore !== undefined) out.lead_score = r.leadScore;
  if (r.scoreReason !== undefined) out.score_reason = r.scoreReason;
  if (r.suggestedPitch !== undefined) out.suggested_pitch = r.suggestedPitch;
  if (r.recommendedNextStep !== undefined)
    out.recommended_next_step = r.recommendedNextStep;
  if (r.source !== undefined) out.source = r.source;
  if (r.status !== undefined) out.status = r.status;
  if (r.updatedAt !== undefined) out.updated_at = r.updatedAt;
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseNote(row: any): RetailerNote {
  return {
    id: row.id,
    retailerId: row.retailer_id,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseLog(row: any): RetailerOutreachLog {
  return {
    id: row.id,
    retailerId: row.retailer_id,
    channel: row.channel,
    message: row.message,
    outcome: row.outcome,
    contactedAt: row.contacted_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseContact(row: any): RetailerContact {
  return {
    id: row.id,
    retailerId: row.retailer_id,
    contactName: row.contact_name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
  };
}

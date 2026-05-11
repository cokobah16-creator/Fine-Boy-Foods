// ─────────────────────────────────────────────────────────────────────────────
// Fine Boy Foods — Offline-first sync engine
//
// Every write to a tracked Dexie table is auto-queued and flushed to Supabase
// when the device is online. Each row carries a sync-status flag the UI can
// surface (Synced / Pending / Failed). Designed so existing services don't
// need to know it exists — Dexie creating/updating/deleting hooks install
// the queueing automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase, supabaseConfigured } from "@/lib/supabase";
import { camelToSnake, toSnakeKeys } from "@/lib/keyCase";

// ── Types ───────────────────────────────────────────────────────────────────

export type SyncOp = "upsert" | "delete";
export type SyncRowStatus = "pending" | "synced" | "failed";

export interface SyncQueueItem {
  id?: number;
  table: TrackedTable;
  op: SyncOp;
  rowId: string;
  payload?: Record<string, unknown> | null;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  nextAttemptAt: string;
}

export interface SyncMetaRow {
  // `${table}:${rowId}` — composite primary key
  key: string;
  table: TrackedTable;
  rowId: string;
  status: SyncRowStatus;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  updatedAt: string;
}

// ── Registry ────────────────────────────────────────────────────────────────
// One entry per Dexie table we want to sync. The supabaseTable is the remote
// snake_case table name; pkField is the Dexie primary-key field name.

export const SYNC_REGISTRY = {
  products:           { supabaseTable: "products",           pkField: "id" },
  inventoryBatches:   { supabaseTable: "inventory_batches",  pkField: "id" },
  rawMaterials:       { supabaseTable: "raw_materials",      pkField: "id" },
  orders:             { supabaseTable: "orders",             pkField: "id" },
  deliveries:         { supabaseTable: "deliveries",         pkField: "id" },
  drivers:            { supabaseTable: "drivers",            pkField: "id" },
  productionBatches:  { supabaseTable: "production_batches", pkField: "id" },
  qcRecords:          { supabaseTable: "qc_records",         pkField: "id" },
  financeEntries:     { supabaseTable: "finance_entries",    pkField: "id" },
  customerCredits:    { supabaseTable: "customer_credits",   pkField: "retailerId" },
  employees:          { supabaseTable: "employees",          pkField: "id" },
  payrollRuns:        { supabaseTable: "payroll_runs",       pkField: "id" },
} as const;

export type TrackedTable = keyof typeof SYNC_REGISTRY;

export const TRACKED_TABLES = Object.keys(SYNC_REGISTRY) as TrackedTable[];

// ── Status observable ───────────────────────────────────────────────────────

export interface SyncStatusSnapshot {
  online: boolean;
  draining: boolean;
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  configured: boolean;
}

type Listener = (snap: SyncStatusSnapshot) => void;

const listeners = new Set<Listener>();
let snapshot: SyncStatusSnapshot = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  draining: false,
  pending: 0,
  failed: 0,
  lastSyncedAt: null,
  lastError: null,
  configured: supabaseConfigured,
};

function emit(patch: Partial<SyncStatusSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const fn of listeners) fn(snapshot);
}

export function subscribeSyncStatus(fn: Listener): () => void {
  listeners.add(fn);
  fn(snapshot);
  return () => listeners.delete(fn);
}

export function getSyncStatus(): SyncStatusSnapshot {
  return snapshot;
}

// ── Queue + meta access ─────────────────────────────────────────────────────
// Imported lazily to break the circular import between sync.ts and db.ts.

async function getDb() {
  const mod = await import("@/lib/db");
  return mod.db;
}

function metaKey(table: TrackedTable, rowId: string): string {
  return `${table}:${rowId}`;
}

async function refreshCounts() {
  const db = await getDb();
  const [pending, failed] = await Promise.all([
    db.syncMeta.where("status").equals("pending").count(),
    db.syncMeta.where("status").equals("failed").count(),
  ]);
  emit({ pending, failed });
}

// ── Enqueue ─────────────────────────────────────────────────────────────────

async function enqueueInternal(item: {
  table: TrackedTable;
  op: SyncOp;
  rowId: string;
  payload?: Record<string, unknown> | null;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const queueRow: SyncQueueItem = {
    table: item.table,
    op: item.op,
    rowId: item.rowId,
    payload: item.payload ?? null,
    attempts: 0,
    lastError: null,
    createdAt: now,
    nextAttemptAt: now,
  };
  await db.syncQueue.add(queueRow);

  const key = metaKey(item.table, item.rowId);
  await db.syncMeta.put({
    key,
    table: item.table,
    rowId: item.rowId,
    status: "pending",
    lastSyncedAt: null,
    lastError: null,
    updatedAt: now,
  });

  void refreshCounts();
  // Try to drain immediately — cheap if offline (single online check).
  void drain();
}

// Called from Dexie hooks. Captures a stable snapshot of the row.
export function enqueueAfterChange(
  table: TrackedTable,
  op: SyncOp,
  rowId: string,
  payload?: Record<string, unknown> | null
) {
  if (!rowId) return;
  // Defer to a microtask so the originating Dexie transaction can commit
  // first. This avoids cross-table transaction conflicts inside the hook.
  queueMicrotask(() => {
    void enqueueInternal({ table, op, rowId, payload });
  });
}

// ── Drain loop ──────────────────────────────────────────────────────────────

const MAX_BACKOFF_MS = 5 * 60_000; // 5 minutes
const BASE_BACKOFF_MS = 2_000;
let drainLock = false;

function backoffFor(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

export async function drain(): Promise<void> {
  if (drainLock) return;
  if (!snapshot.online) return;
  if (!supabaseConfigured || !supabase) {
    // Nowhere to sync to. Leave items queued; they'll flush once configured.
    return;
  }
  drainLock = true;
  emit({ draining: true });
  try {
    const db = await getDb();
    const nowIso = new Date().toISOString();
    // Pick up to 25 items whose nextAttemptAt has passed. We sort by id
    // (insertion order) so FIFO is preserved.
    const ready = await db.syncQueue
      .orderBy("id")
      .filter((q) => q.nextAttemptAt <= nowIso)
      .limit(25)
      .toArray();

    for (const item of ready) {
      if (!snapshot.online) break;
      await processItem(item);
    }
    await refreshCounts();
  } finally {
    drainLock = false;
    emit({ draining: false });
  }
}

async function processItem(item: SyncQueueItem): Promise<void> {
  if (!supabase) return;
  const cfg = SYNC_REGISTRY[item.table];
  const db = await getDb();

  const pkColumn = camelToSnake(cfg.pkField);

  try {
    if (item.op === "delete") {
      const { error } = await supabase
        .from(cfg.supabaseTable)
        .delete()
        .eq(pkColumn, item.rowId);
      if (error) throw new Error(error.message);
    } else {
      const payload = item.payload ?? {};
      const remote = toSnakeKeys(payload as Record<string, unknown>);
      const { error } = await supabase
        .from(cfg.supabaseTable)
        .upsert(remote, { onConflict: pkColumn });
      if (error) throw new Error(error.message);
    }

    // Success — remove from queue + mark meta synced.
    if (item.id != null) await db.syncQueue.delete(item.id);
    const now = new Date().toISOString();
    await db.syncMeta.put({
      key: metaKey(item.table, item.rowId),
      table: item.table,
      rowId: item.rowId,
      status: "synced",
      lastSyncedAt: now,
      lastError: null,
      updatedAt: now,
    });
    emit({ lastSyncedAt: now, lastError: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = item.attempts + 1;
    const nextAttemptAt = new Date(Date.now() + backoffFor(attempts)).toISOString();
    if (item.id != null) {
      await db.syncQueue.update(item.id, {
        attempts,
        lastError: message,
        nextAttemptAt,
      });
    }
    await db.syncMeta.put({
      key: metaKey(item.table, item.rowId),
      table: item.table,
      rowId: item.rowId,
      status: "failed",
      lastSyncedAt: snapshot.lastSyncedAt,
      lastError: message,
      updatedAt: new Date().toISOString(),
    });
    emit({ lastError: message });
  }
}

// Manual retry: reset backoff on every failed/pending item and kick the drain.
export async function retryAll(): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const all = await db.syncQueue.toArray();
  for (const q of all) {
    if (q.id == null) continue;
    await db.syncQueue.update(q.id, { nextAttemptAt: now, lastError: null });
  }
  await refreshCounts();
  void drain();
}

// ── Bootstrap ───────────────────────────────────────────────────────────────

let started = false;
let pollHandle: ReturnType<typeof setInterval> | null = null;

export function startSyncEngine() {
  if (started) return;
  started = true;

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      emit({ online: true });
      void drain();
    });
    window.addEventListener("offline", () => emit({ online: false }));
  }

  // Periodic poll — covers cases where the browser doesn't fire 'online'
  // (mobile background, captive portals). Cheap when offline because drain()
  // bails out instantly.
  pollHandle = setInterval(() => {
    void drain();
  }, 30_000);

  void refreshCounts();
  void drain();
}

export function stopSyncEngine() {
  if (pollHandle != null) clearInterval(pollHandle);
  pollHandle = null;
  started = false;
}

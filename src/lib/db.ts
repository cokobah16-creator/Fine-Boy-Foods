import Dexie, { type Table } from "dexie";
import type {
  Retailer,
  RetailerContact,
  RetailerNote,
  RetailerOutreachLog,
  RetailerFollowup,
} from "@/types/retailer";
import type {
  Product,
  InventoryBatch,
  RawMaterial,
  Order,
  Delivery,
  Driver,
  ProductionBatch,
  QCRecord,
  FinanceEntry,
  CustomerCredit,
  Alert,
  AppUser,
  Employee,
  PayrollRun,
} from "@/types/operations";
import {
  SYNC_REGISTRY,
  TRACKED_TABLES,
  enqueueAfterChange,
  type SyncQueueItem,
  type SyncMetaRow,
  type TrackedTable,
} from "@/lib/sync";

export class FBFDatabase extends Dexie {
  // ── Retailer CRM (existing) ───────────────────────────────────────────────
  retailers!: Table<Retailer>;
  retailerContacts!: Table<RetailerContact>;
  retailerNotes!: Table<RetailerNote>;
  retailerOutreachLogs!: Table<RetailerOutreachLog>;
  retailerFollowups!: Table<RetailerFollowup>;

  // ── Retail Operations ─────────────────────────────────────────────────────
  products!: Table<Product>;
  inventoryBatches!: Table<InventoryBatch>;
  rawMaterials!: Table<RawMaterial>;
  orders!: Table<Order>;
  deliveries!: Table<Delivery>;
  drivers!: Table<Driver>;
  productionBatches!: Table<ProductionBatch>;
  qcRecords!: Table<QCRecord>;
  financeEntries!: Table<FinanceEntry>;
  customerCredits!: Table<CustomerCredit, string>;
  alerts!: Table<Alert>;
  users!: Table<AppUser>;
  employees!: Table<Employee>;
  payrollRuns!: Table<PayrollRun>;

  // ── Sync metadata (v4) ────────────────────────────────────────────────────
  syncQueue!: Table<SyncQueueItem, number>;
  syncMeta!: Table<SyncMetaRow, string>;

  constructor() {
    super("FineBoyfoodsDB");

    // v1 — original CRM schema
    this.version(1).stores({
      retailers:
        "id, businessName, area, category, status, leadScore, createdAt, updatedAt",
      retailerContacts: "id, retailerId, createdAt",
      retailerNotes: "id, retailerId, createdAt",
      retailerOutreachLogs: "id, retailerId, contactedAt",
      retailerFollowups: "id, retailerId, followupDate, completed",
    });

    // v2 — retail operations tables
    this.version(2).stores({
      retailers:
        "id, businessName, area, category, status, leadScore, createdAt, updatedAt",
      retailerContacts: "id, retailerId, createdAt",
      retailerNotes: "id, retailerId, createdAt",
      retailerOutreachLogs: "id, retailerId, contactedAt",
      retailerFollowups: "id, retailerId, followupDate, completed",
      products: "id, sku, name, createdAt",
      inventoryBatches:
        "id, productId, batchCode, expiryDate, qcStatus, createdAt",
      rawMaterials: "id, name, createdAt",
      orders: "id, orderCode, retailerId, status, paymentStatus, createdAt",
      deliveries: "id, orderId, driverId, status, scheduledFor, createdAt",
      drivers: "id, name, active, createdAt",
      productionBatches: "id, batchCode, productId, productionDate, createdAt",
      qcRecords: "id, inventoryBatchId, status, inspectedAt",
      financeEntries: "id, type, category, occurredAt, createdAt",
      customerCredits: "retailerId, balance, updatedAt",
      alerts: "id, kind, severity, acknowledged, createdAt",
      users: "id, name, role, createdAt",
    });

    // v3 — payroll tables (employees, payroll runs)
    this.version(3).stores({
      retailers:
        "id, businessName, area, category, status, leadScore, createdAt, updatedAt",
      retailerContacts: "id, retailerId, createdAt",
      retailerNotes: "id, retailerId, createdAt",
      retailerOutreachLogs: "id, retailerId, contactedAt",
      retailerFollowups: "id, retailerId, followupDate, completed",
      products: "id, sku, name, createdAt",
      inventoryBatches:
        "id, productId, batchCode, expiryDate, qcStatus, createdAt",
      rawMaterials: "id, name, createdAt",
      orders: "id, orderCode, retailerId, status, paymentStatus, createdAt",
      deliveries: "id, orderId, driverId, status, scheduledFor, createdAt",
      drivers: "id, name, active, createdAt",
      productionBatches: "id, batchCode, productId, productionDate, createdAt",
      qcRecords: "id, inventoryBatchId, status, inspectedAt",
      financeEntries: "id, type, category, occurredAt, createdAt",
      customerCredits: "retailerId, balance, updatedAt",
      alerts: "id, kind, severity, acknowledged, createdAt",
      users: "id, name, role, createdAt",
      employees:
        "id, fullName, department, status, payFrequency, hireDate, createdAt",
      payrollRuns: "id, runCode, status, periodStart, periodEnd, payDate, createdAt",
    });

    // v4 — offline-first sync queue + per-row sync status
    this.version(4).stores({
      retailers:
        "id, businessName, area, category, status, leadScore, createdAt, updatedAt",
      retailerContacts: "id, retailerId, createdAt",
      retailerNotes: "id, retailerId, createdAt",
      retailerOutreachLogs: "id, retailerId, contactedAt",
      retailerFollowups: "id, retailerId, followupDate, completed",
      products: "id, sku, name, createdAt",
      inventoryBatches:
        "id, productId, batchCode, expiryDate, qcStatus, createdAt",
      rawMaterials: "id, name, createdAt",
      orders: "id, orderCode, retailerId, status, paymentStatus, createdAt",
      deliveries: "id, orderId, driverId, status, scheduledFor, createdAt",
      drivers: "id, name, active, createdAt",
      productionBatches: "id, batchCode, productId, productionDate, createdAt",
      qcRecords: "id, inventoryBatchId, status, inspectedAt",
      financeEntries: "id, type, category, occurredAt, createdAt",
      customerCredits: "retailerId, balance, updatedAt",
      alerts: "id, kind, severity, acknowledged, createdAt",
      users: "id, name, role, createdAt",
      employees:
        "id, fullName, department, status, payFrequency, hireDate, createdAt",
      payrollRuns:
        "id, runCode, status, periodStart, periodEnd, payDate, createdAt",
      syncQueue: "++id, table, rowId, nextAttemptAt, createdAt",
      syncMeta: "key, table, status, updatedAt",
    });

    installSyncHooks(this);
  }
}

// Install creating/updating/deleting hooks on every tracked table so writes
// from existing services are auto-enqueued for sync without code changes.
function installSyncHooks(database: FBFDatabase) {
  for (const tableName of TRACKED_TABLES) {
    const table = database.table(tableName) as Table<Record<string, unknown>>;
    const cfg = SYNC_REGISTRY[tableName as TrackedTable];

    table.hook("creating", function (primKey, obj) {
      // `primKey` is undefined for auto-increment, but our tables use the
      // pkField from the row itself, so fall back to that.
      const id = String(primKey ?? (obj as Record<string, unknown>)[cfg.pkField] ?? "");
      const payload = { ...obj, [cfg.pkField]: id || (obj as Record<string, unknown>)[cfg.pkField] };
      enqueueAfterChange(tableName as TrackedTable, "upsert", id, payload as Record<string, unknown>);
    });

    table.hook("updating", function (modifications, primKey, obj) {
      const id = String(primKey ?? (obj as Record<string, unknown>)[cfg.pkField] ?? "");
      const merged = { ...(obj as Record<string, unknown>), ...(modifications as Record<string, unknown>) };
      enqueueAfterChange(tableName as TrackedTable, "upsert", id, merged);
    });

    table.hook("deleting", function (primKey) {
      const id = String(primKey ?? "");
      enqueueAfterChange(tableName as TrackedTable, "delete", id);
    });
  }
}

export const db = new FBFDatabase();

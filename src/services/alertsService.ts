import { db } from "@/lib/db";
import type { Alert, AlertKind, AlertSeverity } from "@/types/operations";

function uuid(): string {
  return crypto.randomUUID();
}

const DAY_MS = 86_400_000;

export async function listAlerts(): Promise<Alert[]> {
  const all = await db.alerts.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOpenAlerts(): Promise<Alert[]> {
  return (await listAlerts()).filter((a) => !a.acknowledged);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await db.alerts.update(id, { acknowledged: true });
}

export async function clearAcknowledged(): Promise<void> {
  const ack = await db.alerts.toArray();
  await db.alerts.bulkDelete(
    ack.filter((a) => a.acknowledged).map((a) => a.id)
  );
}

async function upsertAlert(
  kind: AlertKind,
  severity: AlertSeverity,
  title: string,
  message: string,
  entityId: string | null
): Promise<void> {
  const existing = await db.alerts
    .where("kind")
    .equals(kind)
    .and((a) => a.entityId === entityId && !a.acknowledged)
    .first();
  if (existing) {
    await db.alerts.update(existing.id, { message, severity, title });
    return;
  }
  await db.alerts.add({
    id: uuid(),
    kind,
    severity,
    title,
    message,
    entityId,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  });
}

// Recompute alerts based on current inventory + retailer state.
export async function recomputeAlerts(): Promise<void> {
  const products = await db.products.toArray();
  const batches = await db.inventoryBatches.toArray();
  const raws = await db.rawMaterials.toArray();
  const orders = await db.orders.toArray();
  const retailers = await db.retailers.toArray();

  // Low stock per product
  for (const p of products) {
    const total = batches
      .filter((b) => b.productId === p.id)
      .reduce((s, b) => s + b.quantity, 0);
    if (total < p.lowStockThreshold) {
      await upsertAlert(
        "low_stock",
        total === 0 ? "critical" : "warning",
        `Low stock: ${p.name}`,
        `${total} units remaining (threshold ${p.lowStockThreshold}).`,
        p.id
      );
    }
  }

  // Raw material low
  for (const r of raws) {
    if (r.quantity < r.lowStockThreshold) {
      await upsertAlert(
        "raw_low",
        r.quantity === 0 ? "critical" : "warning",
        `Raw material low: ${r.name}`,
        `${r.quantity}${r.unit} left (threshold ${r.lowStockThreshold}${r.unit}).`,
        r.id
      );
    }
  }

  // Expiry near / passed
  const now = Date.now();
  for (const b of batches) {
    if (b.quantity <= 0) continue;
    const exp = new Date(b.expiryDate).getTime();
    const days = Math.floor((exp - now) / DAY_MS);
    if (days < 0) {
      await upsertAlert(
        "expiry_passed",
        "critical",
        `Batch expired: ${b.batchCode}`,
        `Batch with ${b.quantity} units expired ${Math.abs(days)} days ago.`,
        b.id
      );
    } else if (days <= 14) {
      await upsertAlert(
        "expiry_near",
        days <= 7 ? "warning" : "info",
        `Batch expiring soon: ${b.batchCode}`,
        `${b.quantity} units expire in ${days} day${days === 1 ? "" : "s"}.`,
        b.id
      );
    }
  }

  // Retailer inactive: supplied retailers with no order in the last 30 days
  const cutoff = now - 30 * DAY_MS;
  for (const r of retailers) {
    if (r.status !== "supplied") continue;
    const lastOrder = orders
      .filter((o) => o.retailerId === r.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!lastOrder || new Date(lastOrder.createdAt).getTime() < cutoff) {
      await upsertAlert(
        "retailer_inactive",
        "info",
        `${r.businessName} hasn't ordered recently`,
        lastOrder
          ? `Last order ${new Date(lastOrder.createdAt).toLocaleDateString()}.`
          : `No orders recorded yet.`,
        r.id
      );
    }
  }
}

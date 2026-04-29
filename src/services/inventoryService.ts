import { db } from "@/lib/db";
import type {
  InventoryBatch,
  Product,
  RawMaterial,
} from "@/types/operations";

function uuid(): string {
  return crypto.randomUUID();
}

export interface ProductStockSummary {
  product: Product;
  totalQuantity: number;
  batches: InventoryBatch[];
  lowStock: boolean;
  expiringSoonCount: number;
  expiredCount: number;
}

export async function listInventoryBatches(): Promise<InventoryBatch[]> {
  return db.inventoryBatches.orderBy("createdAt").reverse().toArray();
}

export async function getBatchesForProduct(
  productId: string
): Promise<InventoryBatch[]> {
  return db.inventoryBatches.where("productId").equals(productId).toArray();
}

export async function getInventoryBatch(
  id: string
): Promise<InventoryBatch | undefined> {
  return db.inventoryBatches.get(id);
}

export async function addInventoryBatch(input: {
  productId: string;
  batchCode: string;
  quantity: number;
  productionDate: string;
  expiryDate: string;
  qcStatus?: InventoryBatch["qcStatus"];
  notes?: string | null;
}): Promise<InventoryBatch> {
  const now = new Date().toISOString();
  const batch: InventoryBatch = {
    id: uuid(),
    productId: input.productId,
    batchCode: input.batchCode,
    initialQuantity: input.quantity,
    quantity: input.quantity,
    productionDate: input.productionDate,
    expiryDate: input.expiryDate,
    qcStatus: input.qcStatus ?? "pending",
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.inventoryBatches.add(batch);
  return batch;
}

export async function updateBatchQuantity(
  id: string,
  delta: number
): Promise<void> {
  const batch = await db.inventoryBatches.get(id);
  if (!batch) return;
  const next = Math.max(0, batch.quantity + delta);
  await db.inventoryBatches.update(id, {
    quantity: next,
    updatedAt: new Date().toISOString(),
  });
}

export async function setBatchQCStatus(
  id: string,
  status: InventoryBatch["qcStatus"]
): Promise<void> {
  await db.inventoryBatches.update(id, {
    qcStatus: status,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBatch(id: string): Promise<void> {
  await db.inventoryBatches.delete(id);
}

// FIFO-style consumption by expiry. Returns a list of batches consumed.
export async function consumeProductStock(
  productId: string,
  quantity: number
): Promise<{
  consumed: { batchId: string; batchCode: string; quantity: number }[];
  shortfall: number;
}> {
  const batches = await db.inventoryBatches
    .where("productId")
    .equals(productId)
    .toArray();
  const usable = batches
    .filter((b) => b.quantity > 0 && b.qcStatus !== "fail")
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  let remaining = quantity;
  const consumed: {
    batchId: string;
    batchCode: string;
    quantity: number;
  }[] = [];

  for (const batch of usable) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    const newQty = batch.quantity - take;
    await db.inventoryBatches.update(batch.id, {
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    });
    consumed.push({ batchId: batch.id, batchCode: batch.batchCode, quantity: take });
    remaining -= take;
  }

  return { consumed, shortfall: remaining };
}

export async function getStockSummary(): Promise<ProductStockSummary[]> {
  const products = await db.products.toArray();
  const allBatches = await db.inventoryBatches.toArray();
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 14);

  return products.map((product) => {
    const batches = allBatches
      .filter((b) => b.productId === product.id)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const expiringSoonCount = batches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return b.quantity > 0 && exp >= today && exp <= soon;
    }).length;
    const expiredCount = batches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return b.quantity > 0 && exp < today;
    }).length;
    return {
      product,
      batches,
      totalQuantity,
      lowStock: totalQuantity < product.lowStockThreshold,
      expiringSoonCount,
      expiredCount,
    };
  });
}

// ── Raw materials ───────────────────────────────────────────────────────────

export async function listRawMaterials(): Promise<RawMaterial[]> {
  return db.rawMaterials.orderBy("name").toArray();
}

export async function addRawMaterial(input: {
  name: string;
  unit: RawMaterial["unit"];
  quantity: number;
  lowStockThreshold: number;
  costPerUnit: number;
}): Promise<RawMaterial> {
  const now = new Date().toISOString();
  const raw: RawMaterial = {
    id: uuid(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.rawMaterials.add(raw);
  return raw;
}

export async function adjustRawMaterial(
  id: string,
  delta: number
): Promise<void> {
  const raw = await db.rawMaterials.get(id);
  if (!raw) return;
  await db.rawMaterials.update(id, {
    quantity: Math.max(0, raw.quantity + delta),
    updatedAt: new Date().toISOString(),
  });
}

export async function setRawMaterialQuantity(
  id: string,
  quantity: number
): Promise<void> {
  await db.rawMaterials.update(id, {
    quantity: Math.max(0, quantity),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRawMaterial(id: string): Promise<void> {
  await db.rawMaterials.delete(id);
}

export function generateBatchCode(productSku: string): string {
  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${productSku}-${stamp}-${rand}`;
}

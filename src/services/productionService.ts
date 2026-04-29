import { db } from "@/lib/db";
import type {
  ProductionBatch,
  Product,
  RawMaterial,
} from "@/types/operations";
import {
  addInventoryBatch,
  generateBatchCode,
  adjustRawMaterial,
} from "@/services/inventoryService";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listProductionBatches(): Promise<ProductionBatch[]> {
  const batches = await db.productionBatches.toArray();
  return batches.sort((a, b) =>
    b.productionDate.localeCompare(a.productionDate)
  );
}

export interface RawConsumption {
  rawMaterialId: string;
  quantity: number;
}

export async function recordProductionBatch(input: {
  productId: string;
  rawUsed: RawConsumption[];
  outputQuantity: number;
  wasteQuantity: number;
  productionDate: string;
  expiryDate: string;
  operator: string;
  notes?: string | null;
}): Promise<ProductionBatch> {
  const product = (await db.products.get(input.productId)) as Product | undefined;
  if (!product) throw new Error("Product not found");

  const allRaw = await db.rawMaterials.toArray();
  const rawById = new Map<string, RawMaterial>(allRaw.map((r) => [r.id, r]));

  // Validate raw materials
  for (const r of input.rawUsed) {
    const raw = rawById.get(r.rawMaterialId);
    if (!raw) throw new Error("Raw material missing");
    if (raw.quantity < r.quantity)
      throw new Error(
        `Not enough ${raw.name}. Available ${raw.quantity}${raw.unit}, needed ${r.quantity}${raw.unit}.`
      );
  }

  // Deduct raw materials
  for (const r of input.rawUsed) {
    await adjustRawMaterial(r.rawMaterialId, -r.quantity);
  }

  // Create the inventory batch (status: pending QC)
  const batchCode = generateBatchCode(product.sku);
  const inventoryBatch = await addInventoryBatch({
    productId: product.id,
    batchCode,
    quantity: input.outputQuantity,
    productionDate: input.productionDate,
    expiryDate: input.expiryDate,
    qcStatus: "pending",
    notes: input.notes ?? null,
  });

  const record: ProductionBatch = {
    id: uuid(),
    batchCode,
    productId: product.id,
    productName: product.name,
    rawUsed: input.rawUsed.map((r) => ({
      rawMaterialId: r.rawMaterialId,
      rawName: rawById.get(r.rawMaterialId)?.name ?? "Unknown",
      quantity: r.quantity,
    })),
    outputQuantity: input.outputQuantity,
    wasteQuantity: input.wasteQuantity,
    productionDate: input.productionDate,
    expiryDate: input.expiryDate,
    operator: input.operator,
    inventoryBatchId: inventoryBatch.id,
    notes: input.notes ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.productionBatches.add(record);
  return record;
}

export interface ProductionStats {
  totalBatches: number;
  totalOutput: number;
  totalWaste: number;
  wasteRate: number;
  perProduct: { productName: string; output: number; waste: number }[];
}

export async function getProductionStats(): Promise<ProductionStats> {
  const batches = await db.productionBatches.toArray();
  const totalOutput = batches.reduce((s, b) => s + b.outputQuantity, 0);
  const totalWaste = batches.reduce((s, b) => s + b.wasteQuantity, 0);
  const totalAttempted = totalOutput + totalWaste;

  const map = new Map<string, { output: number; waste: number }>();
  for (const b of batches) {
    const cur = map.get(b.productName) ?? { output: 0, waste: 0 };
    cur.output += b.outputQuantity;
    cur.waste += b.wasteQuantity;
    map.set(b.productName, cur);
  }

  return {
    totalBatches: batches.length,
    totalOutput,
    totalWaste,
    wasteRate: totalAttempted > 0 ? totalWaste / totalAttempted : 0,
    perProduct: Array.from(map.entries()).map(([productName, v]) => ({
      productName,
      output: v.output,
      waste: v.waste,
    })),
  };
}

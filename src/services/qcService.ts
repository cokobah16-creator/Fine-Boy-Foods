import { db } from "@/lib/db";
import type { QCRecord } from "@/types/operations";
import { setBatchQCStatus } from "@/services/inventoryService";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listQCRecords(): Promise<QCRecord[]> {
  const recs = await db.qcRecords.toArray();
  return recs.sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt));
}

export async function getQCForBatch(
  inventoryBatchId: string
): Promise<QCRecord | undefined> {
  return db.qcRecords
    .where("inventoryBatchId")
    .equals(inventoryBatchId)
    .last();
}

export async function recordQCInspection(input: {
  inventoryBatchId: string;
  batchCode: string;
  productName: string;
  inspector: string;
  criteria: QCRecord["criteria"];
  notes: string;
}): Promise<QCRecord> {
  const total = Object.values(input.criteria).reduce((s, v) => s + v, 0);
  const max = Object.keys(input.criteria).length * 5;
  // Pass threshold: average score >= 3 across all criteria AND no zero scores.
  const noZero = Object.values(input.criteria).every((v) => v > 0);
  const status: QCRecord["status"] = total / max >= 0.6 && noZero ? "pass" : "fail";

  const record: QCRecord = {
    id: uuid(),
    inventoryBatchId: input.inventoryBatchId,
    batchCode: input.batchCode,
    productName: input.productName,
    status,
    inspector: input.inspector,
    criteria: input.criteria,
    notes: input.notes,
    inspectedAt: new Date().toISOString(),
  };
  await db.qcRecords.add(record);

  // Mirror status onto the inventory batch
  await setBatchQCStatus(input.inventoryBatchId, status);
  // Failed batches: zero out quantity so they cannot be sold accidentally.
  if (status === "fail") {
    await db.inventoryBatches.update(input.inventoryBatchId, {
      quantity: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  return record;
}

export interface QCStats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export async function getQCStats(): Promise<QCStats> {
  const recs = await db.qcRecords.toArray();
  const passed = recs.filter((r) => r.status === "pass").length;
  const failed = recs.filter((r) => r.status === "fail").length;
  return {
    total: recs.length,
    passed,
    failed,
    passRate: recs.length > 0 ? passed / recs.length : 0,
  };
}

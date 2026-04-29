import { db } from "@/lib/db";
import type { Delivery, DeliveryStatus, Driver } from "@/types/operations";
import { setOrderStatus, getOrder } from "@/services/orderService";

function uuid(): string {
  return crypto.randomUUID();
}

// ── Drivers ─────────────────────────────────────────────────────────────────

const SEED_DRIVERS = [
  { name: "Musa Ibrahim", phone: "+234 803 555 0142", vehicle: "Hilux DAA-321XA" },
  { name: "Chidi Okafor", phone: "+234 805 555 0179", vehicle: "Sienna ABJ-902XS" },
];

export async function ensureDriversSeeded(): Promise<void> {
  const count = await db.drivers.count();
  if (count > 0) return;
  const now = new Date().toISOString();
  await db.drivers.bulkAdd(
    SEED_DRIVERS.map((d) => ({
      id: uuid(),
      name: d.name,
      phone: d.phone,
      vehicle: d.vehicle,
      active: true,
      createdAt: now,
    }))
  );
}

export async function listDrivers(): Promise<Driver[]> {
  return db.drivers.orderBy("name").toArray();
}

export async function addDriver(input: {
  name: string;
  phone: string;
  vehicle?: string;
}): Promise<Driver> {
  const driver: Driver = {
    id: uuid(),
    name: input.name,
    phone: input.phone,
    vehicle: input.vehicle ?? null,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await db.drivers.add(driver);
  return driver;
}

export async function deleteDriver(id: string): Promise<void> {
  await db.drivers.delete(id);
}

// ── Deliveries ──────────────────────────────────────────────────────────────

export async function listDeliveries(): Promise<Delivery[]> {
  const list = await db.deliveries.toArray();
  return list.sort((a, b) =>
    b.scheduledFor.localeCompare(a.scheduledFor)
  );
}

export async function getDelivery(id: string): Promise<Delivery | undefined> {
  return db.deliveries.get(id);
}

export async function getDeliveryForOrder(
  orderId: string
): Promise<Delivery | undefined> {
  return db.deliveries.where("orderId").equals(orderId).first();
}

export async function scheduleDelivery(input: {
  orderId: string;
  driverId: string;
  scheduledFor: string;
  vehicle?: string | null;
}): Promise<Delivery> {
  const order = await getOrder(input.orderId);
  if (!order) throw new Error("Order not found");

  const driver = await db.drivers.get(input.driverId);
  if (!driver) throw new Error("Driver not found");

  // Move order into "processing" if it isn't already (this consumes stock).
  if (order.status === "pending") {
    await setOrderStatus(order.id, "processing");
  }

  const now = new Date().toISOString();
  const delivery: Delivery = {
    id: uuid(),
    orderId: order.id,
    orderCode: order.orderCode,
    retailerName: order.retailerName,
    driverId: driver.id,
    driverName: driver.name,
    vehicle: input.vehicle ?? driver.vehicle ?? null,
    scheduledFor: input.scheduledFor,
    status: "scheduled",
    proofImage: null,
    proofNotes: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.deliveries.add(delivery);
  return delivery;
}

export async function setDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  extra?: { proofImage?: string | null; proofNotes?: string | null }
): Promise<Delivery | undefined> {
  const delivery = await db.deliveries.get(deliveryId);
  if (!delivery) return;

  const patch: Partial<Delivery> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (status === "in_transit" && !delivery.startedAt) {
    patch.startedAt = new Date().toISOString();
  }
  if (status === "delivered") {
    patch.completedAt = new Date().toISOString();
    if (extra?.proofImage !== undefined) patch.proofImage = extra.proofImage;
    if (extra?.proofNotes !== undefined) patch.proofNotes = extra.proofNotes;
    // Mark the order as delivered as well
    await setOrderStatus(delivery.orderId, "delivered");
  }

  await db.deliveries.update(deliveryId, patch);
  return db.deliveries.get(deliveryId);
}

export async function attachDeliveryProof(
  deliveryId: string,
  proofImage: string,
  proofNotes?: string
): Promise<void> {
  await db.deliveries.update(deliveryId, {
    proofImage,
    proofNotes: proofNotes ?? null,
    updatedAt: new Date().toISOString(),
  });
}

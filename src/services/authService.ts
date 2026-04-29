import { db } from "@/lib/db";
import type { AppUser, AuthSession, UserRole } from "@/types/operations";

const SESSION_KEY = "fbf.auth.session";

function uuid(): string {
  return crypto.randomUUID();
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function ensureDefaultAdmin(): Promise<void> {
  const count = await db.users.count();
  if (count > 0) return;
  const now = new Date().toISOString();
  const adminPin = "1234";
  await db.users.bulkAdd([
    {
      id: uuid(),
      name: "Admin",
      role: "admin",
      pinHash: await hashPin(adminPin),
      createdAt: now,
    },
    {
      id: uuid(),
      name: "Production",
      role: "production",
      pinHash: await hashPin("2345"),
      createdAt: now,
    },
    {
      id: uuid(),
      name: "Delivery",
      role: "delivery",
      pinHash: await hashPin("3456"),
      createdAt: now,
    },
  ]);
}

export async function listUsers(): Promise<AppUser[]> {
  return db.users.orderBy("createdAt").toArray();
}

export async function createUser(input: {
  name: string;
  role: UserRole;
  pin: string;
}): Promise<AppUser> {
  const user: AppUser = {
    id: uuid(),
    name: input.name,
    role: input.role,
    pinHash: await hashPin(input.pin),
    createdAt: new Date().toISOString(),
  };
  await db.users.add(user);
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
}

export async function changePin(
  userId: string,
  newPin: string
): Promise<void> {
  await db.users.update(userId, { pinHash: await hashPin(newPin) });
}

export async function signIn(
  name: string,
  pin: string
): Promise<AuthSession | null> {
  const user = await db.users.where("name").equalsIgnoreCase(name).first();
  if (!user) return null;
  const hash = await hashPin(pin);
  if (hash !== user.pinHash) return null;
  const session: AuthSession = {
    userId: user.id,
    name: user.name,
    role: user.role,
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function canAccess(
  role: UserRole | undefined,
  required: UserRole[]
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  return required.includes(role);
}

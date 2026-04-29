import { db } from "@/lib/db";
import type { AppUser, AuthSession, UserRole } from "@/types/operations";

const SESSION_KEY = "fbf.auth.session";

// The owner of this deployment. This account is provisioned automatically and
// cannot be deleted, demoted, or have its PIN reset by anyone but the owner.
const OWNER_NAME = "Kristopher Okobah";
const OWNER_PIN = "0798";
const OWNER_ROLE: UserRole = "admin";

// Names of the original demo users that were seeded by an earlier build. If
// they still exist with their unchanged default PINs we wipe them when the
// new bootstrap runs so the workspace starts clean.
const LEGACY_DEFAULTS: { name: string; pin: string }[] = [
  { name: "Admin", pin: "1234" },
  { name: "Production", pin: "2345" },
  { name: "Delivery", pin: "3456" },
];

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

async function clearLegacyDefaults(): Promise<void> {
  for (const def of LEGACY_DEFAULTS) {
    const expected = await hashPin(def.pin);
    const matches = await db.users
      .where("name")
      .equalsIgnoreCase(def.name)
      .toArray();
    for (const u of matches) {
      if (u.pinHash === expected && !u.isProtected) {
        await db.users.delete(u.id);
      }
    }
  }
}

export async function ensureProtectedOwner(): Promise<AppUser> {
  await clearLegacyDefaults();

  const existing = await db.users
    .where("name")
    .equalsIgnoreCase(OWNER_NAME)
    .first();

  if (existing) {
    // Force the role and protected flag back to expected values every boot
    // so the owner cannot be locked out through DB tampering.
    if (
      existing.role !== OWNER_ROLE ||
      existing.isProtected !== true
    ) {
      await db.users.update(existing.id, {
        role: OWNER_ROLE,
        isProtected: true,
      });
    }
    return (await db.users.get(existing.id)) as AppUser;
  }

  const owner: AppUser = {
    id: uuid(),
    name: OWNER_NAME,
    role: OWNER_ROLE,
    pinHash: await hashPin(OWNER_PIN),
    isProtected: true,
    createdAt: new Date().toISOString(),
  };
  await db.users.add(owner);
  return owner;
}

export async function listUsers(): Promise<AppUser[]> {
  return db.users.orderBy("createdAt").toArray();
}

export async function createUser(input: {
  name: string;
  role: UserRole;
  pin: string;
}): Promise<AppUser> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("Name is required");
  if (input.pin.length < 4) throw new Error("PIN must be at least 4 digits");

  // Refuse to clone the protected owner identity.
  if (trimmed.toLowerCase() === OWNER_NAME.toLowerCase()) {
    throw new Error("That name is reserved for the workspace owner.");
  }

  const user: AppUser = {
    id: uuid(),
    name: trimmed,
    role: input.role,
    pinHash: await hashPin(input.pin),
    isProtected: false,
    createdAt: new Date().toISOString(),
  };
  await db.users.add(user);
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  const user = await db.users.get(id);
  if (!user) return;
  if (user.isProtected) {
    throw new Error(`${user.name} is the workspace owner and cannot be removed.`);
  }
  await db.users.delete(id);
}

export async function changePin(
  userId: string,
  newPin: string,
  actorUserId?: string
): Promise<void> {
  if (newPin.length < 4) throw new Error("PIN must be at least 4 digits");
  const user = await db.users.get(userId);
  if (!user) throw new Error("User not found");
  // Only the owner can change the owner's PIN.
  if (user.isProtected && actorUserId && actorUserId !== user.id) {
    throw new Error("Only the workspace owner can change their own PIN.");
  }
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

// Re-exported so the protected owner's name can be referenced by the UI
// (e.g. to lock fields on the Settings screen).
export const PROTECTED_OWNER_NAME = OWNER_NAME;

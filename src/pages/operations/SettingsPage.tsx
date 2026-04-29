import { useEffect, useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { Modal } from "@/components/operations/Modal";
import { EmptyState } from "@/components/operations/EmptyState";
import {
  changePin,
  createUser,
  deleteUser,
  listUsers,
} from "@/services/authService";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/services/productService";
import type {
  AppUser,
  Product,
  ProductFlavour,
  UserRole,
} from "@/types/operations";
import { PRODUCT_FLAVOURS, ROLE_LABELS } from "@/types/operations";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/format";

export function SettingsPage() {
  const { hasRole, session, signOut } = useAuth();
  const isAdmin = hasRole(["admin"]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [pinUser, setPinUser] = useState<AppUser | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [u, p] = await Promise.all([listUsers(), listProducts()]);
    setUsers(u);
    setProducts(p);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Settings"
        subtitle="Users, PINs, products, and your account."
      />

      <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 mb-5">
        <h2 className="text-sm font-semibold text-charcoal-700 mb-2">
          Signed in
        </h2>
        <p className="text-sm text-charcoal-600">
          <strong>{session?.name}</strong> ·{" "}
          {session && ROLE_LABELS[session.role]}
        </p>
        <button onClick={signOut} className="btn-secondary mt-3">
          Sign out
        </button>
      </div>

      {error && (
        <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 mb-3 ring-1 ring-[#F4A36A]">
          {error}
        </p>
      )}

      {isAdmin && (
        <>
          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 mb-5 overflow-hidden">
            <header className="px-5 py-3 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-700">
                Users & PINs
              </h2>
              <button
                onClick={() => setShowAddUser(true)}
                className="btn-primary text-xs"
              >
                <PlusIcon className="h-4 w-4" />
                Add user
              </button>
            </header>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
                <tr>
                  <th className="text-left px-5 py-2">Name</th>
                  <th className="text-left px-5 py-2">Role</th>
                  <th className="px-2 py-2 w-44" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isOwner = Boolean(u.isProtected);
                  const isSelf = u.id === session?.userId;
                  // Only the protected owner themselves can rotate their own PIN.
                  const canChangePin = !isOwner || isSelf;
                  return (
                    <tr key={u.id} className="border-t border-charcoal-50">
                      <td className="px-5 py-2 font-medium text-charcoal-700">
                        <div className="flex items-center gap-2">
                          {u.name}
                          {isOwner && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 ring-1 ring-green-100 rounded-full px-2 py-0.5">
                              <ShieldCheckIcon className="h-3 w-3" />
                              Owner
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-2 text-charcoal-500">
                        {ROLE_LABELS[u.role]}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {canChangePin ? (
                            <button
                              onClick={() => setPinUser(u)}
                              className="text-[11px] px-2 py-1 rounded bg-cream-100 text-charcoal-600 ring-1 ring-charcoal-100 inline-flex items-center gap-1"
                            >
                              <KeyIcon className="h-3 w-3" />
                              Change PIN
                            </button>
                          ) : (
                            <span
                              className="text-[11px] px-2 py-1 rounded bg-cream-50 text-charcoal-400 ring-1 ring-charcoal-100 inline-flex items-center gap-1"
                              title="Only the owner can change their own PIN"
                            >
                              <KeyIcon className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                          {isOwner ? (
                            <span
                              className="text-[11px] text-charcoal-300 inline-flex items-center gap-1"
                              title="The workspace owner cannot be removed"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Protected
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                setError(null);
                                if (isSelf) {
                                  setError(
                                    "You can't delete the user you're signed in as."
                                  );
                                  return;
                                }
                                if (!confirm(`Delete ${u.name}?`)) return;
                                try {
                                  await deleteUser(u.id);
                                  await load();
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                              className="text-[11px] text-[#B23E0E] hover:underline inline-flex items-center gap-1"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-hidden">
            <header className="px-5 py-3 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-700">
                Products & pricing
              </h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="btn-primary text-xs"
              >
                <PlusIcon className="h-4 w-4" />
                Add product
              </button>
            </header>
            {products.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No products yet"
                  description="Add your real product line so you can record production, take orders, and track stock."
                  action={
                    <button
                      onClick={() => setShowAddProduct(true)}
                      className="btn-primary"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add product
                    </button>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
                  <tr>
                    <th className="text-left px-5 py-2">Product</th>
                    <th className="text-left px-5 py-2">SKU</th>
                    <th className="text-right px-5 py-2">Unit price</th>
                    <th className="text-right px-5 py-2">Low-stock threshold</th>
                    <th className="px-2 py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-charcoal-50">
                      <td className="px-5 py-2 font-medium text-charcoal-700">
                        {p.name}
                      </td>
                      <td className="px-5 py-2 text-charcoal-500 font-mono text-xs">
                        {p.sku}
                      </td>
                      <td className="px-5 py-2 text-right">
                        <button
                          onClick={async () => {
                            const v = prompt(
                              `New unit price for ${p.name} (current ${formatNaira(p.unitPrice)})`,
                              String(p.unitPrice)
                            );
                            const n = Number(v);
                            if (Number.isFinite(n) && n > 0) {
                              await updateProduct(p.id, { unitPrice: n });
                              await load();
                            }
                          }}
                          className="font-semibold text-charcoal-700 hover:text-green-700"
                        >
                          {formatNaira(p.unitPrice)}
                        </button>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <button
                          onClick={async () => {
                            const v = prompt(
                              `Low-stock threshold for ${p.name}`,
                              String(p.lowStockThreshold)
                            );
                            const n = Number(v);
                            if (Number.isFinite(n) && n >= 0) {
                              await updateProduct(p.id, {
                                lowStockThreshold: n,
                              });
                              await load();
                            }
                          }}
                          className="font-semibold text-charcoal-700 hover:text-green-700"
                        >
                          {p.lowStockThreshold}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={async () => {
                            setError(null);
                            if (!confirm(`Remove ${p.name}?`)) return;
                            try {
                              await deleteProduct(p.id);
                              await load();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                          className="text-charcoal-300 hover:text-[#B23E0E]"
                          title="Delete product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSaved={async () => {
            setShowAddUser(false);
            await load();
          }}
        />
      )}

      {pinUser && (
        <ChangePinModal
          user={pinUser}
          actorUserId={session?.userId}
          onClose={() => setPinUser(null)}
          onSaved={async () => {
            setPinUser(null);
          }}
        />
      )}

      {showAddProduct && (
        <AddProductModal
          existingSkus={products.map((p) => p.sku)}
          onClose={() => setShowAddProduct(false)}
          onSaved={async () => {
            setShowAddProduct(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("delivery");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || pin.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await createUser({ name: name.trim(), role, pin });
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Add user"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Add user"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Aisha"
          />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="input"
          >
            <option value="admin">Admin</option>
            <option value="production">Production</option>
            <option value="delivery">Delivery</option>
          </select>
        </Field>
        <Field label="4-digit PIN">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="input tracking-widest text-center font-mono text-lg"
            placeholder="••••"
          />
        </Field>
        {error && (
          <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 ring-1 ring-[#F4A36A]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function ChangePinModal({
  user,
  actorUserId,
  onClose,
  onSaved,
}: {
  user: AppUser;
  actorUserId?: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (pin.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await changePin(user.id, pin, actorUserId);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Change PIN — ${user.name}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Update PIN"}
          </button>
        </div>
      }
    >
      <Field label="New 4-digit PIN">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="input tracking-widest text-center font-mono text-lg"
          placeholder="••••"
        />
      </Field>
      {error && (
        <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 ring-1 ring-[#F4A36A] mt-3">
          {error}
        </p>
      )}
    </Modal>
  );
}

function AddProductModal({
  existingSkus,
  onClose,
  onSaved,
}: {
  existingSkus: string[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState<ProductFlavour>(PRODUCT_FLAVOURS[0]);
  const [sku, setSku] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);
  const [colorKey, setColorKey] = useState<Product["colorKey"]>("sweet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!sku.trim() || unitPrice <= 0) {
      setError("Enter a SKU and unit price greater than zero.");
      return;
    }
    if (
      existingSkus.some((s) => s.toLowerCase() === sku.trim().toLowerCase())
    ) {
      setError("A product with that SKU already exists.");
      return;
    }
    setBusy(true);
    try {
      await createProduct({
        name,
        sku: sku.trim(),
        unitPrice,
        lowStockThreshold,
        colorKey,
      });
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Add product"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Add product"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Flavour">
          <select
            value={name}
            onChange={(e) => {
              const v = e.target.value as ProductFlavour;
              setName(v);
              setColorKey(v === "Spicy Suya" ? "spicy" : "sweet");
            }}
            className="input"
          >
            {PRODUCT_FLAVOURS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SKU">
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="input font-mono text-xs uppercase"
            placeholder="e.g. FBF-SO-150G"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit price (₦)">
            <input
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Low-stock threshold">
            <input
              type="number"
              min={0}
              value={lowStockThreshold}
              onChange={(e) =>
                setLowStockThreshold(Number(e.target.value))
              }
              className="input"
            />
          </Field>
        </div>
        {error && (
          <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 ring-1 ring-[#F4A36A]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-charcoal-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon, KeyIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { Modal } from "@/components/operations/Modal";
import {
  changePin,
  createUser,
  deleteUser,
  listUsers,
} from "@/services/authService";
import { listProducts, updateProduct } from "@/services/productService";
import type { AppUser, Product, UserRole } from "@/types/operations";
import { ROLE_LABELS } from "@/types/operations";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/format";

export function SettingsPage() {
  const { hasRole, session, signOut } = useAuth();
  const isAdmin = hasRole(["admin"]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [pinUser, setPinUser] = useState<AppUser | null>(null);

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
                  <th className="px-2 py-2 w-32" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-charcoal-50">
                    <td className="px-5 py-2 font-medium text-charcoal-700">
                      {u.name}
                    </td>
                    <td className="px-5 py-2 text-charcoal-500">
                      {ROLE_LABELS[u.role]}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setPinUser(u)}
                          className="text-[11px] px-2 py-1 rounded bg-cream-100 text-charcoal-600 ring-1 ring-charcoal-100 inline-flex items-center gap-1"
                        >
                          <KeyIcon className="h-3 w-3" />
                          Change PIN
                        </button>
                        {users.length > 1 && (
                          <button
                            onClick={async () => {
                              if (
                                u.id === session?.userId
                              ) {
                                alert("You can't delete the user you're signed in as.");
                                return;
                              }
                              if (confirm(`Delete ${u.name}?`)) {
                                await deleteUser(u.id);
                                await load();
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
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-hidden">
            <header className="px-5 py-3 border-b border-charcoal-100">
              <h2 className="text-sm font-semibold text-charcoal-700">
                Products & pricing
              </h2>
            </header>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
                <tr>
                  <th className="text-left px-5 py-2">Product</th>
                  <th className="text-left px-5 py-2">SKU</th>
                  <th className="text-right px-5 py-2">Unit price</th>
                  <th className="text-right px-5 py-2">Low-stock threshold</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
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
          onClose={() => setPinUser(null)}
          onSaved={async () => {
            setPinUser(null);
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

  const submit = async () => {
    if (!name.trim() || pin.length < 4) return;
    setBusy(true);
    try {
      await createUser({ name: name.trim(), role, pin });
      await onSaved();
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
      </div>
    </Modal>
  );
}

function ChangePinModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pin.length < 4) return;
    setBusy(true);
    try {
      await changePin(user.id, pin);
      await onSaved();
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

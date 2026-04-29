import { useEffect, useState } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { listUsers } from "@/services/authService";
import logoUrl from "@/assets/fbf-logo.png";
import type { AppUser } from "@/types/operations";
import { ROLE_LABELS } from "@/types/operations";

export function LoginPage() {
  const { signIn } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listUsers().then((u) => {
      setUsers(u);
      if (u.length > 0) setSelected(u[0].name);
    });
  }, []);

  const onDigit = (d: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
    setError(null);
  };
  const onBackspace = () => setPin((p) => p.slice(0, -1));
  const onClear = () => setPin("");

  const onSubmit = async () => {
    if (!selected || pin.length < 4) {
      setError("Enter your 4-digit PIN.");
      return;
    }
    setBusy(true);
    const ok = await signIn(selected, pin);
    setBusy(false);
    if (!ok) {
      setError("Wrong PIN. Try again.");
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md ring-1 ring-charcoal-100 p-6">
        <div className="flex flex-col items-center text-center mb-5">
          <img
            src={logoUrl}
            alt="Fine Boy Foods"
            className="h-14 w-14 rounded-full ring-1 ring-charcoal-100 bg-cream-100 mb-3"
          />
          <h1 className="heading-h1 text-xl text-charcoal-700">
            Fine Boy Foods
          </h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Sign in with your role PIN
          </p>
        </div>

        <label className="block text-xs font-semibold text-charcoal-500 mb-1.5">
          Who's signing in?
        </label>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setSelected(u.name);
                setPin("");
                setError(null);
              }}
              className={`px-2 py-2 rounded-md text-xs font-semibold ring-1 transition-colors ${
                selected === u.name
                  ? "bg-green-500 text-white ring-green-500"
                  : "bg-white text-charcoal-600 ring-charcoal-200 hover:bg-cream-50"
              }`}
            >
              <div className="truncate">{u.name}</div>
              <div className="text-[10px] opacity-80 mt-0.5">
                {ROLE_LABELS[u.role]}
              </div>
            </button>
          ))}
        </div>

        <label className="block text-xs font-semibold text-charcoal-500 mb-1.5">
          PIN
        </label>
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-12 w-12 rounded-md flex items-center justify-center text-xl font-bold ring-1 ${
                pin.length > i
                  ? "bg-charcoal-700 text-white ring-charcoal-700"
                  : "bg-white text-charcoal-300 ring-charcoal-200"
              }`}
            >
              {pin.length > i ? "•" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] ring-1 ring-[#F4A36A] rounded-md px-3 py-2 mb-3 text-center">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => onDigit(d)}
              className="h-14 rounded-md text-xl font-semibold bg-cream-100 text-charcoal-700 ring-1 ring-charcoal-100 hover:bg-cream-200 active:translate-y-px"
            >
              {d}
            </button>
          ))}
          <button
            onClick={onClear}
            className="h-14 rounded-md text-xs font-semibold bg-white text-charcoal-500 ring-1 ring-charcoal-200"
          >
            Clear
          </button>
          <button
            onClick={() => onDigit("0")}
            className="h-14 rounded-md text-xl font-semibold bg-cream-100 text-charcoal-700 ring-1 ring-charcoal-100 hover:bg-cream-200 active:translate-y-px"
          >
            0
          </button>
          <button
            onClick={onBackspace}
            className="h-14 rounded-md text-xs font-semibold bg-white text-charcoal-500 ring-1 ring-charcoal-200"
          >
            ⌫
          </button>
        </div>

        <button
          onClick={onSubmit}
          disabled={busy || pin.length < 4}
          className="btn-primary w-full"
        >
          <LockClosedIcon className="h-4 w-4" />
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-[11px] text-charcoal-400 mt-4 text-center leading-relaxed">
          Default PINs (change in Settings):{" "}
          <strong className="text-charcoal-500">Admin</strong> 1234 ·{" "}
          <strong className="text-charcoal-500">Production</strong> 2345 ·{" "}
          <strong className="text-charcoal-500">Delivery</strong> 3456
        </p>
      </div>
    </div>
  );
}

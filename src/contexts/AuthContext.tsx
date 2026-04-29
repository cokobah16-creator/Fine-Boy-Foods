import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ensureDefaultAdmin,
  loadSession,
  signIn as svcSignIn,
  signOut as svcSignOut,
} from "@/services/authService";
import { ensureProductsSeeded } from "@/services/productService";
import { ensureDriversSeeded } from "@/services/distributionService";
import { recomputeAlerts } from "@/services/alertsService";
import type { AuthSession, UserRole } from "@/types/operations";

interface AuthContextValue {
  session: AuthSession | null;
  ready: boolean;
  signIn: (name: string, pin: string) => Promise<boolean>;
  signOut: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await ensureDefaultAdmin();
      await ensureProductsSeeded();
      await ensureDriversSeeded();
      await recomputeAlerts();
      if (!active) return;
      setSession(loadSession());
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (name: string, pin: string) => {
    const result = await svcSignIn(name, pin);
    if (result) setSession(result);
    return Boolean(result);
  }, []);

  const signOut = useCallback(() => {
    svcSignOut();
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!session) return false;
      if (session.role === "admin") return true;
      return roles.includes(session.role);
    },
    [session]
  );

  return (
    <AuthContext.Provider value={{ session, ready, signIn, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

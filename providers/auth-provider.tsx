import { authClient, type AuthSession } from "@/lib/auth-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

type AuthContextValue = {
  session: AuthSession | null;
  user: (AuthSession["user"] & { role?: string }) | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: session,
    isPending,
    isRefetching,
    error,
    refetch,
  } = authClient.useSession();
  const errorMessage = error?.message ?? null;

  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refetch();
      }
    });

    return () => subscription.remove();
  }, [refetch]);

  const logout = useCallback(async () => {
    await authClient.signOut();
    await refetch();
  }, [refetch]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: session ?? null,
      user: session?.user ?? null,
      isLoading: isPending || isRefetching,
      isAuthenticated: Boolean(session),
      error: errorMessage,
      refreshSession,
      logout,
    }),
    [errorMessage, isPending, isRefetching, logout, refreshSession, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

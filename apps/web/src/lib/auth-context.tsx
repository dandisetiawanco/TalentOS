"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import type { AuthenticatedUser, AuthResponse } from "@talentos/contracts";
import { apiRequest, clearSessionTokens, storeSessionTokens } from "./api";
import {
  applyThemePreference,
  readStoredTheme,
  toggleQuickTheme,
  type ThemePreference,
} from "./theme";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  theme: ThemePreference;
  setTheme: (next: ThemePreference) => void;
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<AuthenticatedUser>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    account_type: "recruiter" | "candidate";
    organization_name?: string;
    consent_resume_processing?: boolean;
  }) => Promise<AuthenticatedUser>;
  startDemo: (role: "recruiter" | "hiring_manager" | "candidate") => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  announce: (message: string) => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [user, setUser] = React.useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [theme, setThemeState] = React.useState<ThemePreference>("system");
  const [liveMessage, setLiveMessage] = React.useState("");

  const announce = React.useCallback((message: string) => {
    setLiveMessage("");
    requestAnimationFrame(() => setLiveMessage(message));
  }, []);

  const refreshUser = React.useCallback(async () => {
    try {
      const session = await apiRequest<{ authenticated: boolean; user: AuthenticatedUser | null }>("/auth/session");
      setUser(session.authenticated ? session.user : null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    applyThemePreference(initial);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "talentos-color-scheme") {
        const synced = readStoredTheme();
        setThemeState(synced);
        applyThemePreference(synced);
      }
    };
    window.addEventListener("storage", onStorage);
    void refreshUser();
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshUser]);

  const setTheme = React.useCallback(
    (next: ThemePreference) => {
      setThemeState(next);
      applyThemePreference(next);
      if (user) {
        apiRequest("/auth/preferences", {
          method: "PATCH",
          body: JSON.stringify({ theme: next }),
        }).catch(() => {});
      }
    },
    [user]
  );

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next = toggleQuickTheme(prev);
      if (user) {
        apiRequest("/auth/preferences", {
          method: "PATCH",
          body: JSON.stringify({ theme: next }),
        }).catch(() => {});
      }
      return next;
    });
  }, [user]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeSessionTokens(res.access_token, res.refresh_token);
      setUser(res.user);
      queryClient.clear();
      return res.user;
    },
    [queryClient]
  );

  const register = React.useCallback(
    async (payload: {
      full_name: string;
      email: string;
      password: string;
      account_type: "recruiter" | "candidate";
      organization_name?: string;
      consent_resume_processing?: boolean;
    }) => {
      const res = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      storeSessionTokens(res.access_token, res.refresh_token);
      setUser(res.user);
      queryClient.clear();
      return res.user;
    },
    [queryClient]
  );

  const startDemo = React.useCallback(
    async (role: "recruiter" | "hiring_manager" | "candidate") => {
      const res = await apiRequest<AuthResponse>("/auth/demo", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      storeSessionTokens(res.access_token, res.refresh_token);
      setUser(res.user);
      queryClient.clear();
      return res.user;
    },
    [queryClient]
  );

  const logout = React.useCallback(async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // Clear local session regardless of network outcome.
    }
    clearSessionTokens();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      theme,
      setTheme,
      toggleTheme,
      login,
      register,
      startDemo,
      logout,
      refreshUser,
      announce,
    }),
    [user, isLoading, theme, setTheme, toggleTheme, login, register, startDemo, logout, refreshUser, announce]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthContext.Provider value={value}>
          {children}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveMessage}
          </div>
        </AuthContext.Provider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AppProviders.");
  }
  return ctx;
}

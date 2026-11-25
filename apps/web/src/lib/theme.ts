export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "talentos-color-scheme";

export function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // Storage may be blocked in restricted browser contexts.
  }
  return "system";
}

export function getResolvedTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyThemePreference(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  const metaContent = pref === "system" ? "light dark" : pref;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "color-scheme";
    document.head.appendChild(meta);
  }
  meta.content = metaContent;
  try {
    if (pref === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, pref);
    }
  } catch {
    // Keep visual override applied even if persistence is unavailable.
  }
}

/**
 * Two-state quick toggle that switches to the opposite of the currently rendered theme.
 * If the target matches the OS preference, removes the stored override to return to system default.
 */
export function toggleQuickTheme(currentPref: ThemePreference): ThemePreference {
  const rendered = getResolvedTheme(currentPref);
  const target: "light" | "dark" = rendered === "dark" ? "light" : "dark";
  const systemDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const systemTheme: "light" | "dark" = systemDark ? "dark" : "light";
  const next: ThemePreference = target === systemTheme ? "system" : target;
  applyThemePreference(next);
  return next;
}

export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var m=document.querySelector('meta[name="color-scheme"]');if(m){m.content=(s==="light"||s==="dark")?s:"light dark";}}catch(e){}})();`;

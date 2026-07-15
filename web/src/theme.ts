export type ThemeName = "cyan" | "emerald";

const STORAGE_KEY = "nemesis.theme";
const THEMES: ThemeName[] = ["cyan", "emerald"];

function apply(theme: ThemeName): void {
  if (theme === "cyan") {
    document.documentElement.removeAttribute("data-theme"); // "cyan" is the unmarked default palette
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function readSaved(): ThemeName {
  return localStorage.getItem(STORAGE_KEY) === "emerald" ? "emerald" : "cyan";
}

/** Reads the saved theme (if any) and applies it — call exactly once at startup, before first paint if possible. */
export function initTheme(): ThemeName {
  const theme = readSaved();
  apply(theme);
  return theme;
}

/** Read-only: what theme is currently saved, without touching the DOM. For components that just need the value to render a label. */
export function getTheme(): ThemeName {
  return readSaved();
}

export function setTheme(theme: ThemeName): void {
  localStorage.setItem(STORAGE_KEY, theme);
  apply(theme);
}

export function nextTheme(current: ThemeName): ThemeName {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}

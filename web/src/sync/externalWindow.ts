interface ScreenDetailed {
  isPrimary: boolean;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
}

/**
 * Opens the external-display view. Where the Window Management API is
 * available (Chromium) *and* already granted, it places the window on a
 * non-primary monitor and sizes it to fill it. Everywhere else — including
 * "permission not yet granted", since asking would pop a dialog the user
 * didn't ask for just from this button — it falls back to a plain popup the
 * user can drag over themselves.
 */
export async function openExternalDisplay(): Promise<void> {
  const url = `${window.location.origin}${window.location.pathname}?display=external`;
  const features = await computeSecondScreenFeatures();
  const win = window.open(url, "nemesis-external", features ?? "popup,width=1280,height=800,noopener");
  win?.focus();
}

async function computeSecondScreenFeatures(): Promise<string | null> {
  const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<{ screens: ScreenDetailed[] }> })
    .getScreenDetails;
  if (typeof getScreenDetails !== "function") return null;

  // Only use the enhancement if permission is already granted — calling
  // getScreenDetails() while permission is still in the "prompt" state pops
  // a dialog, and if the user never answers it the call never resolves.
  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "window-management" as PermissionName });
      if (status.state !== "granted") return null;
    } catch {
      return null; // browser doesn't recognize this permission name — treat as unsupported
    }
  }

  try {
    const details = await Promise.race([
      getScreenDetails(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), 1500)),
    ]);
    const external = details.screens.find((s) => !s.isPrimary) ?? details.screens[0];
    if (!external) return null;
    return `left=${external.availLeft},top=${external.availTop},width=${external.availWidth},height=${external.availHeight}`;
  } catch {
    return null; // denied, unsupported, or timed out — fall back to a normal popup
  }
}

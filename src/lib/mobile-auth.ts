import { Capacitor } from "@capacitor/core";

const APP_SCHEME = "memolog-youran";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function getAuthRedirectUrl(path: "/auth/callback" | "/reset-password") {
  if (isNativeApp()) {
    return `${APP_SCHEME}://${path.slice(1)}`;
  }

  return `${window.location.origin}${path}`;
}
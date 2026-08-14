import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.youranwang.memolog",
  appName: "Memolog",
  webDir: "mobile-shell",
  server: {
    url: "https://memolog-v6nv.vercel.app",
    cleartext: false,
    allowNavigation: [
      "memolog-v6nv.vercel.app",
      "*.supabase.co",
    ],
  },
};

export default config;
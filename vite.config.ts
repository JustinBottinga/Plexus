// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Local auto-login (see src/lib/devLogin.ts). The credentials deliberately have no VITE_ prefix and are
// only handed to the dev server: VITE_* variables end up in the client bundle, and builds must never
// contain a password.
const isBuild = process.argv.includes("build");
const devLogin = isBuild ? {} : loadEnv("development", process.cwd(), "DEV_LOGIN_");
const devLoginDefine =
  devLogin["DEV_LOGIN_EMAIL"] && devLogin["DEV_LOGIN_PASSWORD"]
    ? { email: devLogin["DEV_LOGIN_EMAIL"], password: devLogin["DEV_LOGIN_PASSWORD"] }
    : null;

export default defineConfig({
  vite: { define: { __DEV_LOGIN__: JSON.stringify(devLoginDefine) } },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

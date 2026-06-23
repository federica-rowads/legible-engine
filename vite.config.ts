// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Force the nitro deploy plugin ON and hard-pin the Vercel target. Produces the
  // Vercel Build Output API v3 in .vercel/output (real SSR + serverless functions,
  // ready for `vercel deploy --prebuilt`). We are outside a Lovable sandbox, so the
  // preset override applies instead of the forced-Cloudflare sandbox default.
  nitro: { preset: "vercel" },
});

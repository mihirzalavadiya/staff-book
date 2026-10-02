import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: ["src/lib/supabase/**", "src/lib/providers.tsx", "src/lib/useOrigin.ts", "src/lib/localStore.ts", "src/lib/theme.tsx"],
    },
  },
});

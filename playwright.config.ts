import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.test.local") });

// Testes rodam contra o subdomínio do tenant Casah em dev local — mesmo
// padrão já usado no QA manual deste projeto (ver "Notas técnicas" em
// CONTINUITY.md): `*.localhost` resolve para 127.0.0.1 nativamente no
// Chrome, sem mexer no hosts file.
const baseURL = "http://casah.localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
});

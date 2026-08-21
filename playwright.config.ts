import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3021);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup clerk", testMatch: /global\.setup\.ts/ },
    { name: "setup auth", testMatch: /auth\.setup\.ts/, dependencies: ["setup clerk"] },
    {
      name: "signed-out",
      testIgnore: [/\.setup\.ts/, /app-authenticated\.spec\.ts/, /admin\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup clerk"],
    },
    {
      name: "signed-in",
      testMatch: [/app-authenticated\.spec\.ts/, /admin\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup auth"],
    },
  ],
  webServer: {
    // Built output rather than dev: this is the code that actually ships.
    command: `pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

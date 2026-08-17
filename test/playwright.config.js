/**
 * Draait elke test in DRIE echte engines:
 *   chromium -> Blink   (Chrome, Edge, Opera, Samsung Internet)
 *   firefox  -> Gecko   (Firefox desktop en Android)
 *   webkit   -> WebKit  (Safari op macOS, en ELKE browser op iOS -
 *                        ook Chrome en Firefox op een iPhone draaien WebKit)
 * Plus twee mobiele profielen met een echte device-pixelratio.
 *
 * Standaard tegen de live GitHub Pages-site. Wil je tegen een lokale kopie
 * testen (bijvoorbeeld voor je uploadt), zet dan BASE:
 *   BASE=http://127.0.0.1:8899/ npx playwright test
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
    // Antialiasing verschilt per engine en per besturingssysteem. Een strikte
    // 0-pixel-eis zou daardoor altijd rood staan zonder dat er iets mis is.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  reporter: [['html', { open: 'never' }], ['list']],
  // 1 worker. De banners meten zichzelf op tijd (rotatie op 4s, bevriezen op
  // 15s). Parallelle workers vertragen timers en geven vals-negatieven.
  workers: 1,
  use: {
    baseURL: process.env.BASE || 'https://mikezuidgeest-wellis.github.io/wellis-banners/',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'iphone',   use: { ...devices['iPhone 13'] } },
    { name: 'android',  use: { ...devices['Pixel 7'] } },
  ],
});

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "site", "assets", "covers");
const baseUrl = process.env.PORTFOLIO_URL || "http://127.0.0.1:4173";

const shots = [
  {
    name: "amblyopia-cover.png",
    url: `${baseUrl}/amblyopia/`,
    waitMs: 3500,
    viewport: { width: 1280, height: 800 },
  },
  {
    name: "shadow-story-cover.png",
    url: `${baseUrl}/shadow-story/`,
    waitMs: 2500,
    viewport: { width: 1280, height: 800 },
  },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const shot of shots) {
  await page.setViewportSize(shot.viewport);
  await page.goto(shot.url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(shot.waitMs);
  await page.screenshot({
    path: path.join(outDir, shot.name),
    type: "png",
    fullPage: false,
  });
  console.log(`Saved ${shot.name}`);
}

await browser.close();

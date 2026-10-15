import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("test-results/visual", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const [width, height] of [
  [390, 844],
  [768, 1024],
  [1440, 1000],
]) {
  await page.setViewportSize({ width, height });
  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.screenshot({
    path: "test-results/visual/home-" + width + ".png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  const buttonColor = await page
    .getByRole("link", { name: "Find the right care" })
    .evaluate((el) => getComputedStyle(el).color);
  if (buttonColor !== "rgb(255, 255, 255)")
    throw new Error("Primary button contrast regression: " + buttonColor);
  console.log(JSON.stringify({ width, height, overflow, buttonColor }));
}
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log("Three screenshots captured; no browser page errors.");

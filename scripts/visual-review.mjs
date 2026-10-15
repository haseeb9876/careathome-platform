import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  mkdirSync("docs/screenshots", { recursive: true });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("http://127.0.0.1:3000/", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.screenshot({
      path: "docs/screenshots/home-" + width + ".png",
      fullPage: true,
    });
    console.log(
      width +
        "px overflow: " +
        (await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
    );
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  writeFileSync(
    "docs/screenshots/home-accessibility.json",
    JSON.stringify(audit.violations, null, 2),
  );
  console.log(
    JSON.stringify(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

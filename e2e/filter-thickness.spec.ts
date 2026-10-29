import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { routeShellAssets } from "./shell-assets";

test.beforeEach(async ({ page }) => {
  await routeShellAssets(page);
  await page.goto("/");
});

test("T19: all 50 ISO presets have valid filter thickness steps", async ({ page }) => {
  const preset = page.getByLabel("ISO beam quality");
  const names = await preset.locator("option:not([disabled])").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value));
  expect(names).toHaveLength(50);
  for (const name of names) {
    await preset.selectOption(name);
    const fields = page.getByLabel("Filter thickness mm", { exact: true });
    expect(await fields.count(), name).toBeGreaterThan(0);
    const invalid = await fields.evaluateAll((inputs) => inputs.flatMap((el) => {
      const input = el as HTMLInputElement;
      return input.step === "0.001" && input.min === "0" && !input.validity.stepMismatch
        ? [] : [{ value: input.value, step: input.step, mismatch: input.validity.stepMismatch }];
    }));
    expect(invalid, name).toEqual([]);
  }
});

test("T19: 1.001 survives input, arrows, calculation, session export and reload", async ({ page }) => {
  await page.getByRole("button", { name: "+ Filter layer", exact: true }).click();
  const thickness = page.getByLabel("Filter thickness mm", { exact: true }).last();
  await thickness.fill("1.001");
  await expect(thickness).toHaveValue("1.001");
  expect(await thickness.evaluate((el) => (el as HTMLInputElement).validity.stepMismatch)).toBe(false);
  await thickness.press("ArrowUp");
  await expect(thickness).toHaveValue("1.002");
  await thickness.press("ArrowDown");
  await expect(thickness).toHaveValue("1.001");

  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("rfp.input.v1")!).xray.filters.at(-1).thicknessMm)).toBe(1.001);
  await page.getByRole("button", { name: /^Calculate/ }).first().click();
  // The printed summary reads the same committed input passed to computeFast/buildSpectrum.
  await expect(page.locator("section.print-only")).toContainText("1.001 mm Cu");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("section.print-only")).toBeVisible();
  // 판 번호는 정본(src/version.json)에서 읽는다 — 판을 올릴 때마다 이 시험을 고치지 않게(1.0.2 에서 걸렸다).
  const version = JSON.parse(readFileSync(new URL("../src/version.json", import.meta.url), "utf8")).releases[0].version as string;
  await expect(page.locator(".print-head")).toContainText(version);
  await page.emulateMedia({ media: "screen" });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  const file = await download;
  const saved = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(saved.input.xray.filters.at(-1)).toEqual({ material: "Cu", thicknessMm: 1.001 });
  await page.reload();
  await expect(page.getByLabel("Filter thickness mm", { exact: true }).last()).toHaveValue("1.001");
});

test("T19: six-character thickness and spinner space fit at 1280, 390 and 360 px", async ({ page }, testInfo) => {
  for (const width of [1280, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const thickness = page.getByLabel("Filter thickness mm", { exact: true }).first();
    await thickness.fill("10.000");
    await thickness.blur();
    await expect(thickness).toHaveValue("10.000");
    // Audit the actual font and padding, with an additional 20 px reserved for native arrows.
    const metrics = await thickness.evaluate((el) => {
      const input = el as HTMLInputElement;
      const css = getComputedStyle(input);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.font = css.font;
      const required = context.measureText(input.value).width + 20
        + parseFloat(css.paddingLeft) + parseFloat(css.paddingRight)
        + parseFloat(css.borderLeftWidth) + parseFloat(css.borderRightWidth);
      return { actual: input.getBoundingClientRect().width, required, scrollLeft: input.scrollLeft };
    });
    expect(metrics.actual, `${width}px: text, padding and arrows`).toBeGreaterThanOrEqual(metrics.required);
    expect(metrics.scrollLeft, `${width}px: text not scrolled out of view`).toBe(0);
    const overflow = await page.locator(".filter-layer").evaluateAll((rows) => rows.flatMap((row) => {
      const bounds = row.getBoundingClientRect();
      const children = [...row.children].map((child) => child.getBoundingClientRect());
      return children.flatMap((box, index) =>
        box.left < bounds.left - 1 || box.right > bounds.right + 1 || (index > 0 && box.left < children[index - 1].right - 1)
          ? [{ index, left: box.left, right: box.right, rowRight: bounds.right }] : []);
    }));
    expect(overflow, `${width}px: material, thickness, unit and remove button`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await thickness.hover(); // Desktop browsers reveal native arrows on hover.
    await page.locator(".filters").first().screenshot({ path: testInfo.outputPath(`filter-${width}.png`) });
    const measurement = testInfo.outputPath(`filter-${width}-metrics.json`);
    writeFileSync(measurement, JSON.stringify({ viewport: width, ...metrics }, null, 2));
    await testInfo.attach(`filter-${width}-metrics`, { path: measurement, contentType: "application/json" });
  }
});
